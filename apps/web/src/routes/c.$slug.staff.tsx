import { useState } from "react";

import { api } from "@/lib/api";
import { hasRole, useConference } from "@/lib/ConferenceContext";
import { useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, UserMinus, Users2 } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { SearchField } from "@/components/SearchField";
import { Tabs } from "@/components/Tabs";
import { useToast } from "@/components/Toast";
import { Toolbar } from "@/components/Toolbar";

const Search = z.object({
	tab: z.enum(["committees", "staff"]).default("committees").optional(),
	q: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1).optional(),
});

export const Route = createFileRoute("/c/$slug/staff")({
	validateSearch: s => Search.parse(s),
	component: StaffPage,
});

type Committee = {
	id: string;
	name: string;
	slug: string;
	description?: string | null;
	memberCount?: number;
	leadStaffId?: string | null;
};
type Staff = {
	id: string;
	staffCode?: string | null;
	name: string;
	email?: string | null;
	phone?: string | null;
	prantha?: string | null;
	bloodGroup?: string | null;
	role?: string | null;
	committees?: { id: string; name: string }[];
};
type Assignment = {
	id: string;
	staffId: string;
	staffName: string;
	committeeId: string;
	role?: string | null;
};

const PAGE_SIZE = 25;

function StaffPage() {
	const { membership } = useConference();
	const canEdit = hasRole(membership, "editor");
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();
	const tab = search.tab ?? "committees";

	return (
		<div className="p-6">
			<PageHeader
				title="Staff & Committees"
				description="The core executive team organised across operational committees."
			/>
			<Tabs
				value={tab}
				onValueChange={v => setSearch({ tab: v as any, page: 1 })}
				items={[
					{
						value: "committees",
						label: "Committees",
						content: <CommitteesTab canEdit={canEdit} />,
					},
					{
						value: "staff",
						label: "Staff roster",
						content: (
							<StaffTab canEdit={canEdit} search={search} setSearch={setSearch} />
						),
					},
				]}
			/>
		</div>
	);
}

function CommitteesTab({ canEdit }: { canEdit: boolean }) {
	const { conference } = useConference();
	const committees = useQuery<{ data: Committee[] }>({
		queryKey: ["committees", conference.slug],
		queryFn: () =>
			api.get<{ data: Committee[] }>(`/api/v1/c/${conference.slug}/committees`, {
				pageSize: 100,
			}),
	});
	const [open, setOpen] = useState<Committee | null>(null);

	if (committees.isLoading) return <CenterSpinner />;

	return (
		<>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{(committees.data?.data ?? []).map(c => (
					<button
						key={c.id}
						onClick={() => setOpen(c)}
						className="text-left bg-surface border border-line rounded-lg p-4 hover:border-accent transition-colors"
					>
						<div className="flex items-start justify-between gap-2">
							<div className="size-9 rounded-md bg-accent-soft text-accent-soft-fg flex items-center justify-center shrink-0">
								<Users2 size={16} />
							</div>
							<Badge variant="neutral">{c.memberCount ?? 0} members</Badge>
						</div>
						<div className="mt-3 text-sm font-semibold text-ink leading-tight">
							{c.name}
						</div>
						{c.description && (
							<div className="mt-1 text-xs text-ink-3 line-clamp-2">
								{c.description}
							</div>
						)}
					</button>
				))}
			</div>
			{open && (
				<CommitteeDrawer committee={open} canEdit={canEdit} onClose={() => setOpen(null)} />
			)}
		</>
	);
}

function CommitteeDrawer({
	committee,
	canEdit,
	onClose,
}: {
	committee: Committee;
	canEdit: boolean;
	onClose: () => void;
}) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const [adding, setAdding] = useState(false);

	const assignments = useQuery<{ data: Assignment[] }>({
		queryKey: ["assignments", conference.slug, committee.id],
		queryFn: () =>
			api.get<{ data: Assignment[] }>(`/api/v1/c/${conference.slug}/assignments`, {
				committeeId: committee.id,
			}),
	});
	const allStaff = useQuery<{ data: Staff[] }>({
		queryKey: ["staff-all", conference.slug],
		queryFn: () =>
			api.get<{ data: Staff[] }>(`/api/v1/c/${conference.slug}/staff`, {
				pageSize: 500,
			}),
		enabled: adding,
	});

	const addMut = useMutation({
		mutationFn: (staffId: string) =>
			api.post(`/api/v1/c/${conference.slug}/assignments`, {
				committeeId: committee.id,
				staffId,
			}),
		onSuccess: () => {
			qc.invalidateQueries({
				queryKey: ["assignments", conference.slug, committee.id],
			}).catch(console.error);
			qc.invalidateQueries({ queryKey: ["committees", conference.slug] }).catch(
				console.error,
			);
			toast.success("Member added");
		},
		onError: (e: any) => toast.error("Could not add", e.message),
	});
	const removeMut = useMutation({
		mutationFn: (id: string) => api.del(`/api/v1/c/${conference.slug}/assignments/${id}`),
		onSuccess: () => {
			qc.invalidateQueries({
				queryKey: ["assignments", conference.slug, committee.id],
			}).catch(console.error);
			qc.invalidateQueries({ queryKey: ["committees", conference.slug] }).catch(
				console.error,
			);
			toast.success("Member removed");
		},
		onError: (e: any) => toast.error("Could not remove", e.message),
	});

	const assigned = assignments.data?.data ?? [];
	const assignedIds = new Set(assigned.map(a => a.staffId));

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={committee.name}
			subtitle={`${assigned.length} member(s)`}
			width="md"
			footer={
				canEdit && (
					<Button
						variant="primary"
						leadingIcon={<Plus size={13} />}
						onClick={() => setAdding(true)}
					>
						Add member
					</Button>
				)
			}
		>
			{committee.description && (
				<p className="text-sm text-ink-2 mb-4">{committee.description}</p>
			)}
			<div className="space-y-2">
				{assignments.isLoading && <CenterSpinner />}
				{!assignments.isLoading && assigned.length === 0 && (
					<EmptyState title="No members assigned" hint="Add staff from the roster." />
				)}
				{assigned.map(a => (
					<div
						key={a.id}
						className="flex items-center justify-between gap-2 rounded-md border border-line p-2.5"
					>
						<div className="text-sm text-ink">{a.staffName}</div>
						{canEdit && (
							<Button
								variant="ghost"
								size="xs"
								leadingIcon={<UserMinus size={12} />}
								onClick={() => removeMut.mutate(a.id)}
							>
								Remove
							</Button>
						)}
					</div>
				))}
			</div>
			<EntityDrawer
				open={adding}
				onOpenChange={setAdding}
				title="Add committee member"
				width="sm"
			>
				<div className="space-y-1.5">
					{allStaff.isLoading && <CenterSpinner />}
					{(allStaff.data?.data ?? [])
						.filter(s => !assignedIds.has(s.id))
						.map(s => (
							<button
								key={s.id}
								onClick={() => addMut.mutate(s.id)}
								className="w-full text-left px-3 h-9 rounded-md border border-line hover:bg-surface-2 text-sm flex items-center justify-between"
							>
								<span className="text-ink">{s.name}</span>
								{s.prantha && (
									<span className="text-xs text-ink-3">{s.prantha}</span>
								)}
							</button>
						))}
				</div>
			</EntityDrawer>
		</EntityDrawer>
	);
}

function StaffTab({
	canEdit,
	search,
	setSearch,
}: {
	canEdit: boolean;
	search: z.infer<typeof Search>;
	setSearch: (p: Partial<z.infer<typeof Search>>) => void;
}) {
	const { conference } = useConference();
	const qc = useQueryClient();

	const list = useListQuery<Staff>({
		key: ["staff", conference.slug],
		path: `/api/v1/c/${conference.slug}/staff/_with-committees`,
		params: { page: search.page ?? 1, pageSize: PAGE_SIZE, q: search.q },
	});

	const [editing, setEditing] = useState<Staff | null>(null);
	const [creating, setCreating] = useState(false);

	const rows = list.data?.data ?? [];
	const total = list.data?.total ?? 0;

	const cols: Column<Staff>[] = [
		{
			key: "name",
			header: "Name",
			cell: r => (
				<div className="min-w-0">
					<div className="text-ink font-medium truncate">{r.name}</div>
					<div className="text-xs text-ink-3 truncate">
						{[r.email, r.phone].filter(Boolean).join(" · ")}
					</div>
				</div>
			),
		},
		{
			key: "prantha",
			header: "Prantha",
			cell: r => <span className="text-xs text-ink-2">{r.prantha ?? "—"}</span>,
			width: "w-36",
		},
		{
			key: "blood",
			header: "Blood",
			cell: r => (
				<span className="text-xs text-ink-2">
					{r.bloodGroup ? r.bloodGroup.toUpperCase().replace("_", " ") : "—"}
				</span>
			),
			width: "w-24",
		},
		{
			key: "committees",
			header: "Committees",
			cell: r => (
				<div className="flex flex-wrap gap-1">
					{(r.committees ?? []).slice(0, 3).map(c => (
						<Badge key={c.id} size="xs" variant="accent">
							{c.name}
						</Badge>
					))}
					{(r.committees?.length ?? 0) > 3 && (
						<Badge size="xs" variant="neutral">
							+{(r.committees!.length ?? 0) - 3}
						</Badge>
					)}
					{!r.committees?.length && <span className="text-xs text-ink-3">—</span>}
				</div>
			),
		},
	];

	return (
		<>
			<Card pad="sm">
				<Toolbar
					left={
						<SearchField
							value={search.q ?? ""}
							onChange={q => setSearch({ q, page: 1 })}
							placeholder="Search staff..."
							className="min-w-60"
						/>
					}
					right={
						canEdit && (
							<Button
								variant="primary"
								size="sm"
								leadingIcon={<Plus size={13} />}
								onClick={() => setCreating(true)}
							>
								Add staff
							</Button>
						)
					}
				/>
				<DataTable
					columns={cols}
					rows={rows}
					loading={list.isLoading}
					onRowClick={r => setEditing(r)}
					selectedKey={editing?.id ?? null}
					emptyTitle="No staff yet"
				/>
				<Pagination
					page={search.page ?? 1}
					pageSize={PAGE_SIZE}
					total={total}
					onChange={p => setSearch({ page: p })}
				/>
			</Card>

			{(editing || creating) && (
				<StaffDrawer
					staff={editing}
					onClose={() => {
						setEditing(null);
						setCreating(false);
					}}
					onSaved={() => qc.invalidateQueries({ queryKey: ["staff", conference.slug] })}
				/>
			)}
		</>
	);
}

function StaffDrawer({
	staff,
	onClose,
	onSaved,
}: {
	staff: Staff | null;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { conference } = useConference();
	const toast = useToast();
	const isEdit = !!staff;
	const [form, setForm] = useState<Partial<Staff>>(staff ?? {});

	const save = useMutation({
		mutationFn: () => {
			const path = `/api/v1/c/${conference.slug}/staff`;
			const body = {
				name: form.name,
				email: form.email || undefined,
				phone: form.phone || undefined,
				prantha: form.prantha || undefined,
				bloodGroup: form.bloodGroup || undefined,
				role: form.role || undefined,
			};
			return isEdit ? api.patch(`${path}/${staff!.id}`, body) : api.post(path, body);
		},
		onSuccess: () => {
			onSaved();
			toast.success(isEdit ? "Staff updated" : "Staff added");
			onClose();
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});

	const upd = (p: Partial<Staff>) => setForm(f => ({ ...f, ...p }));

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={isEdit ? staff!.name : "Add staff"}
			width="md"
			footer={
				<>
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button
						variant="primary"
						loading={save.isPending}
						onClick={() => save.mutate()}
					>
						{isEdit ? "Save" : "Create"}
					</Button>
				</>
			}
		>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<FieldRow label="Name" required className="sm:col-span-2">
					<Input value={form.name ?? ""} onChange={e => upd({ name: e.target.value })} />
				</FieldRow>
				<FieldRow label="Email">
					<Input
						type="email"
						value={form.email ?? ""}
						onChange={e => upd({ email: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Phone">
					<Input
						value={form.phone ?? ""}
						onChange={e => upd({ phone: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Prantha">
					<Input
						value={form.prantha ?? ""}
						onChange={e => upd({ prantha: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Blood group">
					<Select
						value={form.bloodGroup ?? ""}
						onChange={e => upd({ bloodGroup: e.target.value || null })}
					>
						<option value="">—</option>
						{[
							"a_pos",
							"a_neg",
							"b_pos",
							"b_neg",
							"o_pos",
							"o_neg",
							"ab_pos",
							"ab_neg",
							"unknown",
						].map(b => (
							<option key={b} value={b}>
								{b.toUpperCase().replace("_", " ")}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Role / designation" className="sm:col-span-2">
					<Input value={form.role ?? ""} onChange={e => upd({ role: e.target.value })} />
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}
