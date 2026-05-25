import { useState } from "react";

import { api } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { humanise } from "@/lib/format";
import { useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare, Plus, Square, Trash2 } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useConfirm } from "@/components/ConfirmDialog";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { CenterSpinner } from "@/components/EmptyState";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { SearchField } from "@/components/SearchField";
import { useToast } from "@/components/Toast";
import { Toolbar } from "@/components/Toolbar";

const Search = z.object({
	q: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1).optional(),
});

export const Route = createFileRoute("/c/$slug/vip")({
	validateSearch: s => Search.parse(s),
	component: VipPage,
});

type Vip = {
	id: string;
	name: string;
	designation: string;
	institution: string;
	protocolLevel: string;
	arrivalTime: string;
	departureTime: string;
	vehicle: string;
	securityRequired: boolean;
	speechRequired: boolean;
	greenRoom: string;
	status: string;
	notes: string;
};
type ChecklistItem = {
	id: string;
	vipGuestId: string;
	item: string;
	isDone: boolean;
	notes?: string | null;
};

const PAGE_SIZE = 20;

function VipPage() {
	const { conference, membership } = useConference();
	const canEdit = hasAtLeastRole(membership, "editor");
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();

	const list = useListQuery<Vip>({
		key: ["vip", conference.slug],
		path: `/api/v1/c/${conference.slug}/vip`,
		params: { page: search.page ?? 1, pageSize: PAGE_SIZE, q: search.q },
	});

	const [open, setOpen] = useState<Vip | null>(null);
	const [creating, setCreating] = useState(false);

	const rows = list.data?.data ?? [];
	const cols: Column<Vip>[] = [
		{
			key: "name",
			header: "Guest",
			cell: r => (
				<div className="min-w-0">
					<div className="text-ink font-medium truncate">{r.name}</div>
					<div className="text-xs text-ink-3 truncate">
						{[r.designation, r.institution].filter(Boolean).join(" · ")}
					</div>
				</div>
			),
		},
		{
			key: "protocol",
			header: "Protocol",
			cell: r => (
				<Badge
					className="capitalize"
					variant={r.protocolLevel === "a_plus" ? "success" : "neutral"}
				>
					{humanise(r.protocolLevel ?? "none")}
				</Badge>
			),
			width: "w-32",
		},
		{
			key: "status",
			header: "Status",
			cell: r => <Badge className="capitalize">{r.status}</Badge>,
			width: "w-28",
		},
		{
			key: "arrival",
			header: "Arrival",
			cell: r => (r.arrivalTime ? new Date(r.arrivalTime).toLocaleString() : "-"),
			width: "w-32",
		},
		{
			key: "departure",
			header: "Departure",
			cell: r => (r.departureTime ? new Date(r.departureTime).toLocaleString() : "-"),
			width: "w-32",
		},
		{
			key: "vehicle",
			header: "Vehicle",
			cell: r => r.vehicle || "-",
			width: "w-32",
		},
		{
			key: "requirements",
			header: "Requirements",
			cell: r => (
				<div className="flex flex-col gap-1">
					{r.securityRequired && <Badge variant="danger">Security required</Badge>}
					{r.speechRequired && <Badge variant="accent">Speech required</Badge>}
					{r.greenRoom && <Badge variant="success">Green room: {r.greenRoom}</Badge>}
					{!r.securityRequired && !r.speechRequired && !r.greenRoom && (
						<span className="text-ink-3">None</span>
					)}
				</div>
			),
		},
		{
			key: "notes",
			header: "Notes",
			cell: r => (
				<div className="text-sm text-ink-2 whitespace-pre-wrap max-h-20 overflow-hidden">
					{r.notes || "-"}
				</div>
			),
		},
	];

	return (
		<div className="p-6">
			<PageHeader
				title="VIP Guests"
				description="Protocol tracking for keynote speakers, dignitaries, and special guests."
				actions={
					canEdit && (
						<Button
							variant="primary"
							leadingIcon={<Plus size={14} />}
							onClick={() => setCreating(true)}
						>
							Add VIP
						</Button>
					)
				}
			/>
			<Card pad="sm">
				<Toolbar
					left={
						<SearchField
							value={search.q ?? ""}
							onChange={q => setSearch({ q, page: 1 })}
							placeholder="Search VIP guests..."
							className="min-w-60"
						/>
					}
				/>
				<DataTable
					columns={cols}
					rows={rows}
					loading={list.isLoading}
					onRowClick={r => setOpen(r)}
					selectedKey={open?.id ?? null}
					emptyTitle="No VIP guests"
				/>
				<Pagination
					page={search.page ?? 1}
					pageSize={PAGE_SIZE}
					total={list.data?.pagination?.total ?? 0}
					onChange={p => setSearch({ page: p })}
				/>
			</Card>
			{open && <VipDrawer vip={open} canEdit={canEdit} onClose={() => setOpen(null)} />}
			{creating && <CreateVipDrawer onClose={() => setCreating(false)} />}
		</div>
	);
}

function VipDrawer({ vip, canEdit, onClose }: { vip: Vip; canEdit: boolean; onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const confirm = useConfirm();
	const [newItem, setNewItem] = useState("");

	const checklist = useQuery<{ data: ChecklistItem[] }>({
		queryKey: ["vip-checklist", conference.slug, vip.id],
		queryFn: () => api.get(`/api/v1/c/${conference.slug}/vip-checklist/${vip.id}`),
	});

	const addItem = useMutation({
		mutationFn: () =>
			api.post(`/api/v1/c/${conference.slug}/vip-checklist/${vip.id}`, { item: newItem }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["vip-checklist", conference.slug, vip.id] }).catch(
				console.error,
			);
			setNewItem("");
		},
		onError: (e: any) => toast.error("Could not add item", e.message),
	});
	const toggle = useMutation({
		mutationFn: (item: ChecklistItem) =>
			api.patch(`/api/v1/c/${conference.slug}/vip-checklist/${vip.id}/${item.id}`, {
				isDone: !item.isDone,
			}),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["vip-checklist", conference.slug, vip.id] }),
	});

	const del = useMutation({
		mutationFn: () => api.del(`/api/v1/c/${conference.slug}/vip/${vip.id}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["vip", conference.slug] }).catch(console.error);
			toast.success("VIP guest deleted");
			onClose();
		},
		onError: (e: any) => toast.error("Delete failed", e.message),
	});

	const items = checklist.data?.data ?? [];
	const done = items.filter(i => i.isDone).length;

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={vip.name}
			subtitle={[vip.designation, vip.institution].filter(Boolean).join(" · ")}
			status={
				<Badge variant="warn" className="capitalize">
					{humanise(vip.protocolLevel ?? "none")}
				</Badge>
			}
			width="md"
			footer={
				canEdit ? (
					<div className="flex items-center gap-2">
						<Button
							variant="danger"
							leadingIcon={<Trash2 size={14} />}
							loading={del.isPending}
							onClick={async () => {
								const ok = await confirm({
									title: `Delete VIP guest?`,
									description: `"${vip.name}" will be permanently deleted.`,
									tone: "danger",
									confirmLabel: "Delete",
								});
								if (ok) del.mutate();
							}}
						>
							Delete
						</Button>
						<Button variant="ghost" onClick={onClose}>
							Close
						</Button>
					</div>
				) : (
					<Button variant="ghost" onClick={onClose}>
						Close
					</Button>
				)
			}
		>
			<div className="space-y-4">
				{vip.arrivalTime && (
					<div>
						<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1">
							Arrival time
						</div>
						<p className="text-sm text-ink-2">
							{new Date(vip.arrivalTime).toLocaleString()}
						</p>
					</div>
				)}
				{vip.departureTime && (
					<div>
						<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1">
							Departure time
						</div>
						<p className="text-sm text-ink-2">
							{new Date(vip.departureTime).toLocaleString()}
						</p>
					</div>
				)}
				{vip.vehicle && (
					<div>
						<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1">
							Vehicle
						</div>
						<p className="text-sm text-ink-2">{vip.vehicle}</p>
					</div>
				)}
				<div>
					<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1">
						Requirements
					</div>
					{vip.securityRequired || vip.speechRequired || vip.greenRoom ? (
						<div className="flex flex-col gap-1">
							{vip.securityRequired && (
								<Badge variant="danger">Security required</Badge>
							)}
							{vip.speechRequired && <Badge variant="accent">Speech required</Badge>}
							{vip.greenRoom && (
								<Badge variant="success">Green room: {vip.greenRoom}</Badge>
							)}
						</div>
					) : (
						<span className="text-sm text-ink-2">None</span>
					)}
				</div>
				{vip.notes && (
					<div>
						<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1">
							Notes
						</div>
						<p className="text-sm text-ink-2 whitespace-pre-wrap">{vip.notes}</p>
					</div>
				)}
				<div>
					<div className="flex items-center justify-between mb-2">
						<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
							Protocol checklist
						</div>
						<Badge
							variant={
								done === items.length && items.length > 0 ? "success" : "neutral"
							}
						>
							{done}/{items.length}
						</Badge>
					</div>
					{checklist.isLoading && <CenterSpinner />}
					<div className="space-y-1.5">
						{items.map(item => (
							<button
								key={item.id}
								disabled={!canEdit}
								onClick={() => toggle.mutate(item)}
								className="w-full flex items-center gap-2.5 p-2 rounded-md hover:bg-surface-2 text-left disabled:cursor-default"
							>
								{item.isDone ? (
									<CheckSquare size={16} className="text-success shrink-0" />
								) : (
									<Square size={16} className="text-ink-3 shrink-0" />
								)}
								<span
									className={
										item.isDone
											? "text-sm text-ink-3 line-through"
											: "text-sm text-ink"
									}
								>
									{item.item}
								</span>
							</button>
						))}
					</div>
					{canEdit && (
						<div className="flex gap-2 mt-2">
							<Input
								value={newItem}
								onChange={e => setNewItem(e.target.value)}
								onKeyDown={e => e.key === "Enter" && newItem && addItem.mutate()}
								placeholder="Add checklist item..."
							/>
							<Button
								variant="secondary"
								disabled={!newItem}
								loading={addItem.isPending}
								onClick={() => addItem.mutate()}
							>
								Add
							</Button>
						</div>
					)}
				</div>
			</div>
		</EntityDrawer>
	);
}

function CreateVipDrawer({ onClose }: { onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const [form, setForm] = useState({
		name: "",
		designation: "",
		institution: "",
		protocolLevel: "none",
		status: "pending",
		notes: "",
	});
	const create = useMutation({
		mutationFn: () => api.post(`/api/v1/c/${conference.slug}/vip`, form),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["vip", conference.slug] }).catch(console.error);
			toast.success("VIP guest added");
			onClose();
		},
		onError: (e: any) => toast.error("Create failed", e.message),
	});
	const upd = (p: Partial<typeof form>) => setForm(f => ({ ...f, ...p }));
	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title="Add VIP guest"
			width="md"
			footer={
				<>
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button
						variant="primary"
						loading={create.isPending}
						onClick={() => create.mutate()}
					>
						Create
					</Button>
				</>
			}
		>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<FieldRow label="Name" required className="sm:col-span-2">
					<Input value={form.name} onChange={e => upd({ name: e.target.value })} />
				</FieldRow>
				<FieldRow label="Designation">
					<Input
						value={form.designation}
						onChange={e => upd({ designation: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Institution">
					<Input
						value={form.institution}
						onChange={e => upd({ institution: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Protocol level">
					<Select
						value={form.protocolLevel}
						onChange={e => upd({ protocolLevel: e.target.value })}
					>
						<option value="a_plus">A+</option>
						<option value="a">A</option>
						<option value="b">B</option>
						<option value="c">C</option>
						<option value="none">None</option>
					</Select>
				</FieldRow>
				<FieldRow label="Status">
					<Select value={form.status} onChange={e => upd({ status: e.target.value })}>
						{["pending", "confirmed", "arrived", "completed", "cancelled"].map(s => (
							<option key={s} value={s}>
								{humanise(s)}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Notes" className="sm:col-span-2">
					<Textarea value={form.notes} onChange={e => upd({ notes: e.target.value })} />
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}
