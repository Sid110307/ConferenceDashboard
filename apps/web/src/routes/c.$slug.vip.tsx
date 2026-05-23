import { useState } from "react";

import { api } from "@/lib/api";
import { hasRole, useConference } from "@/lib/ConferenceContext";
import { useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CheckSquare, Plus, Square } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { CenterSpinner } from "@/components/EmptyState";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Textarea } from "@/components/Input";
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
	designation?: string | null;
	organisation?: string | null;
	protocolLevel?: string | null;
	arrivalNotes?: string | null;
	phone?: string | null;
};
type ChecklistItem = {
	id: string;
	vipGuestId: string;
	label: string;
	isDone: boolean;
	notes?: string | null;
};

const PAGE_SIZE = 25;

function VipPage() {
	const { conference, membership } = useConference();
	const canEdit = hasRole(membership, "editor");
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
						{[r.designation, r.organisation].filter(Boolean).join(" · ")}
					</div>
				</div>
			),
		},
		{
			key: "protocol",
			header: "Protocol",
			cell: r => (
				<Badge variant="warn" className="capitalize">
					{r.protocolLevel ?? "standard"}
				</Badge>
			),
			width: "w-32",
		},
		{
			key: "phone",
			header: "Phone",
			cell: r => <span className="text-xs text-ink-2">{r.phone ?? "—"}</span>,
			width: "w-40",
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
	const [newItem, setNewItem] = useState("");

	const checklist = useQuery<{ data: ChecklistItem[] }>({
		queryKey: ["vip-checklist", conference.slug, vip.id],
		queryFn: () =>
			api.get<{ data: ChecklistItem[] }>(`/api/v1/c/${conference.slug}/vip-checklist`, {
				vipGuestId: vip.id,
			}),
	});

	const addItem = useMutation({
		mutationFn: () =>
			api.post(`/api/v1/c/${conference.slug}/vip-checklist`, {
				vipGuestId: vip.id,
				label: newItem,
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["vip-checklist", conference.slug, vip.id] });
			setNewItem("");
		},
		onError: (e: any) => toast.error("Could not add item", e.message),
	});
	const toggle = useMutation({
		mutationFn: (item: ChecklistItem) =>
			api.patch(`/api/v1/c/${conference.slug}/vip-checklist/${item.id}`, {
				isDone: !item.isDone,
			}),
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["vip-checklist", conference.slug, vip.id] }),
	});

	const items = checklist.data?.data ?? [];
	const done = items.filter(i => i.isDone).length;

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={vip.name}
			subtitle={[vip.designation, vip.organisation].filter(Boolean).join(" · ")}
			status={
				<Badge variant="warn" className="capitalize">
					{vip.protocolLevel ?? "standard"} protocol
				</Badge>
			}
			width="md"
		>
			<div className="space-y-4">
				{vip.arrivalNotes && (
					<div>
						<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1">
							Arrival notes
						</div>
						<p className="text-sm text-ink-2 whitespace-pre-wrap">{vip.arrivalNotes}</p>
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
									{item.label}
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
		organisation: "",
		phone: "",
		protocolLevel: "standard",
		arrivalNotes: "",
	});
	const create = useMutation({
		mutationFn: () => api.post(`/api/v1/c/${conference.slug}/vip`, form),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["vip", conference.slug] });
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
				<FieldRow label="Organisation">
					<Input
						value={form.organisation}
						onChange={e => upd({ organisation: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Phone">
					<Input value={form.phone} onChange={e => upd({ phone: e.target.value })} />
				</FieldRow>
				<FieldRow label="Protocol level">
					<Input
						value={form.protocolLevel}
						onChange={e => upd({ protocolLevel: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Arrival notes" className="sm:col-span-2">
					<Textarea
						value={form.arrivalNotes}
						onChange={e => upd({ arrivalNotes: e.target.value })}
					/>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}
