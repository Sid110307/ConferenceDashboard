import { useState } from "react";

import { api } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { humanise, slugify } from "@/lib/format";
import { useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import {
	committeeAssignmentCreateSchema,
	committeeCreateSchema,
	committeeUpdateSchema,
	GENDERS,
	staffCreateSchema,
	staffUpdateSchema,
	type Committee,
	type CommitteeAssignmentInput,
	type CommitteeCreateInput,
	type CommitteeUpdateInput,
	type Staff,
	type StaffCreateInput,
	type StaffUpdateInput,
} from "@conference/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	BedDouble,
	BookOpen,
	Building,
	CalendarCheck,
	Camera,
	ClipboardList,
	Coffee,
	Cpu,
	Drama,
	Gauge,
	HeartPulse,
	Image,
	IndianRupee,
	Layers,
	Megaphone,
	Mic2,
	MonitorSpeaker,
	Plus,
	Star,
	Toolbox,
	TowerControl,
	Truck,
	UserMinus,
	Users2,
} from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useConfirm } from "@/components/ConfirmDialog";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";
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

type CommitteeType = Committee & { memberCount?: number; leadCount?: number };
type StaffType = Staff & {
	committees?: {
		id: string;
		slug: string;
		name: string;
		role?: string | null;
		isLead?: boolean;
	}[];
};
type Assignment = {
	id: string;
	staffId: string;
	staffName: string;
	committeeId: string;
	role?: string | null;
	isLead?: boolean;
};

const PAGE_SIZE = 20;

const ICONS: Record<string, React.ReactNode> = {
	"control-room": <TowerControl size={18} />,
	"daily-control-system": <Gauge size={18} />,
	"finance-sponsorship": <IndianRupee size={18} />,
	"audio-visual-it": <MonitorSpeaker size={18} />,
	"venue-infrastructure": <Building size={18} />,
	"photography-social-media": <Camera size={18} />,
	"cultural-activities": <Drama size={18} />,
	"keynote-program": <Mic2 size={18} />,
	"banner-print": <Image size={18} />,
	"publication": <BookOpen size={18} />,
	"publicity": <Megaphone size={18} />,
	"central-coordination": <Layers size={18} />,
	"safety-medical": <HeartPulse size={18} />,
	"vyavastha-resource-mobilization": <Toolbox size={18} />,
	"program-coordinator": <CalendarCheck size={18} />,
	"anchoring": <Star size={18} />,
	"technical-stage": <Cpu size={18} />,
	"food-dining": <Coffee size={18} />,
	"registration": <ClipboardList size={18} />,
	"accommodation": <BedDouble size={18} />,
	"transportation": <Truck size={18} />,
};

function StaffPage() {
	const { membership } = useConference();
	const canEdit = hasAtLeastRole(membership, "editor");
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
						label: "Staff",
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
	const committees = useQuery<{ data: CommitteeType[] }>({
		queryKey: ["committees", conference.slug],
		queryFn: () =>
			api.get<{ data: CommitteeType[] }>(`/api/v1/c/${conference.slug}/committees`, {
				pageSize: 100,
			}),
	});

	const [creating, setCreating] = useState(false);
	const [open, setOpen] = useState<Committee | null>(null);

	return committees.isLoading ? (
		<CenterSpinner />
	) : (
		<>
			{canEdit && (
				<div className="flex justify-end mb-3">
					<Button
						variant="primary"
						size="sm"
						leadingIcon={<Plus size={13} />}
						onClick={() => setCreating(true)}
					>
						New committee
					</Button>
				</div>
			)}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{(committees.data?.data ?? []).map(c => (
					<Card
						key={c.id}
						largeIcon
						onClick={() => setOpen(c)}
						className="text-start"
						actions={
							<div className="flex items-center gap-1">
								{c.leadCount && (
									<Badge variant="accent" size="xs">
										<Star size={10} className="mr-0.5" />
										Lead
									</Badge>
								)}
								<Badge
									variant={(c.memberCount || 0) > 0 ? "accent" : "neutral"}
									size="xs"
								>
									{c.memberCount ?? 0} members
								</Badge>
							</div>
						}
						icon={ICONS[c.slug] ?? <Users2 size={18} />}
						title={c.name}
						subtitle={
							c.description && <div className="line-clamp-2">{c.description}</div>
						}
					/>
				))}
			</div>
			{open && (
				<CommitteeDrawer
					committee={open}
					mode="view"
					canEdit={canEdit}
					onClose={() => setOpen(null)}
				/>
			)}
			{creating && (
				<CommitteeDrawer
					committee={null}
					mode="create"
					canEdit={canEdit}
					onClose={() => setCreating(false)}
				/>
			)}
		</>
	);
}

function CommitteeDrawer({
	committee,
	canEdit,
	mode = "view",
	onClose,
}: {
	committee: Committee | null;
	canEdit: boolean;
	mode?: "view" | "create" | "edit";
	onClose: () => void;
}) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const confirm = useConfirm();
	const toast = useToast();

	const isCreate = mode === "create";
	const [drawerMode, setDrawerMode] = useState<"view" | "edit" | "create">(mode);
	const isEditing = drawerMode === "edit" || drawerMode === "create";

	const [adding, setAdding] = useState(false);
	const [form, setForm] = useState<Partial<Committee>>(committee ?? {});

	const upd = (p: Partial<Committee>) => setForm(f => ({ ...f, ...p }));

	const assignments = useQuery<{ data: Assignment[] }>({
		queryKey: ["assignments", conference.slug, committee?.id],
		queryFn: () =>
			api.get<{ data: Assignment[] }>(`/api/v1/c/${conference.slug}/assignments`, {
				committeeId: committee!.id,
			}),
		enabled: !!committee,
	});

	const assigned = assignments.data?.data ?? [];
	const assignedIds = new Set(assigned.map(a => a.staffId));

	const allStaff = useQuery<{ data: Staff[] }>({
		queryKey: ["staff-all", conference.slug],
		queryFn: () =>
			api.get<{ data: Staff[] }>(`/api/v1/c/${conference.slug}/staff`, {
				pageSize: 500,
			}),
		enabled: adding,
	});

	const saveCommitteeMut = useMutation({
		mutationFn: () => {
			const path = `/api/v1/c/${conference.slug}/committees`;
			if (isCreate) {
				const body: CommitteeCreateInput = committeeCreateSchema.parse({
					name: form.name?.trim(),
					slug: slugify(form.name ?? ""),
					description: form.description?.trim() || undefined,
				});
				return api.post(path, body);
			}
			const body: CommitteeUpdateInput = committeeUpdateSchema.parse({
				name: form.name?.trim(),
				slug: slugify(form.name ?? ""),
				description: form.description?.trim() || undefined,
			});
			return api.patch(`${path}/${committee!.id}`, body);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["committees", conference.slug] })
				.catch(console.error)
				.catch(console.error);
			qc.invalidateQueries({ queryKey: ["staff", conference.slug] }).catch(console.error);

			if (committee) {
				qc.invalidateQueries({
					queryKey: ["assignments", conference.slug, committee.id],
				}).catch(console.error);
			}

			toast.success(isCreate ? "Committee created" : "Committee updated");

			if (isCreate) {
				onClose();
			} else {
				setDrawerMode("view");
			}
		},
		onError: (e: any) =>
			toast.error(
				isCreate ? "Could not create committee" : "Could not update committee",
				e.message,
			),
	});

	const addMut = useMutation({
		mutationFn: (staffId: string) =>
			api.post(
				`/api/v1/c/${conference.slug}/assignments`,
				committeeAssignmentCreateSchema.parse({
					committeeId: committee!.id,
					staffId,
				}) as CommitteeAssignmentInput,
			),
		onSuccess: () => {
			qc.invalidateQueries({
				queryKey: ["assignments", conference.slug, committee!.id],
			}).catch(console.error);
			qc.invalidateQueries({ queryKey: ["committees", conference.slug] })
				.catch(console.error)
				.catch(console.error);
			qc.invalidateQueries({ queryKey: ["staff", conference.slug] }).catch(console.error);
			qc.invalidateQueries({ queryKey: ["staff-all", conference.slug] }).catch(console.error);

			setAdding(false);
			toast.success("Member added");
		},
		onError: (e: any) => toast.error("Could not add", e.message),
	});

	const removeMut = useMutation({
		mutationFn: (id: string) => api.del(`/api/v1/c/${conference.slug}/assignments/${id}`),
		onSuccess: () => {
			qc.invalidateQueries({
				queryKey: ["assignments", conference.slug, committee!.id],
			}).catch(console.error);
			qc.invalidateQueries({ queryKey: ["committees", conference.slug] })
				.catch(console.error)
				.catch(console.error);
			qc.invalidateQueries({ queryKey: ["staff", conference.slug] }).catch(console.error);
			qc.invalidateQueries({ queryKey: ["staff-all", conference.slug] }).catch(console.error);

			toast.success("Member removed");
		},
		onError: (e: any) => toast.error("Could not remove", e.message),
	});

	const makeLeadMut = useMutation({
		mutationFn: ({ assignmentId, isLead }: { assignmentId: string; isLead: boolean }) =>
			api.patch(`/api/v1/c/${conference.slug}/assignments/${assignmentId}`, {
				isLead,
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["committees", conference.slug] })
				.catch(console.error)
				.catch(console.error);
			qc.invalidateQueries({ queryKey: ["staff", conference.slug] }).catch(console.error);
			qc.invalidateQueries({
				queryKey: ["assignments", conference.slug, committee!.id],
			}).catch(console.error);

			toast.success("Committee lead updated");
		},
		onError: (e: any) => toast.error("Could not update lead", e.message),
	});

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={isCreate ? "New committee" : isEditing ? "Edit committee" : committee!.name}
			subtitle={!isCreate && !isEditing ? `${assigned.length} member(s)` : undefined}
			width="md"
			footer={
				canEdit && (
					<div className="flex items-center justify-between w-full gap-2">
						<div>
							{!isCreate &&
								(isEditing ? (
									<Button
										variant="ghost"
										onClick={() => {
											setForm(committee ?? {});
											setDrawerMode("view");
										}}
									>
										Cancel edit
									</Button>
								) : (
									<Button variant="ghost" onClick={() => setDrawerMode("edit")}>
										Edit committee
									</Button>
								))}
						</div>
						<div className="flex items-center gap-2">
							{isEditing ? (
								<Button
									variant="primary"
									loading={saveCommitteeMut.isPending}
									onClick={() => saveCommitteeMut.mutate()}
								>
									{isCreate ? "Create" : "Save committee"}
								</Button>
							) : (
								<Button
									variant="primary"
									leadingIcon={<Plus size={13} />}
									onClick={() => setAdding(true)}
								>
									Add member
								</Button>
							)}
						</div>
					</div>
				)
			}
		>
			{isEditing ? (
				<div className="flex flex-col gap-4 mb-5 rounded-lg border border-line bg-surface-1 p-4">
					<FieldRow label="Committee name" required>
						<Input
							value={form.name ?? ""}
							onChange={e => upd({ name: e.target.value })}
						/>
					</FieldRow>
					<FieldRow label="Description">
						<Textarea
							value={form.description ?? ""}
							onChange={e => upd({ description: e.target.value })}
						/>
					</FieldRow>
				</div>
			) : (
				<>
					{committee?.description && (
						<p className="text-sm text-ink-2 mb-3">{committee.description}</p>
					)}
					<div className="space-y-2">
						{assignments.isLoading && <CenterSpinner />}
						{!assignments.isLoading && assigned.length === 0 && (
							<EmptyState
								title="No members assigned"
								hint="Add staff members to this committee."
							/>
						)}
						{assigned.map(a => (
							<div
								key={a.id}
								className="flex items-center justify-between gap-2 rounded-md border border-line p-2.5"
							>
								<div className="min-w-0">
									<div className="text-sm text-ink font-medium truncate">
										{a.staffName}
									</div>
									{a.isLead && (
										<div className="text-xs text-ink-3 flex items-center gap-1">
											<Star size={10} />
											Committee lead
										</div>
									)}
								</div>
								{canEdit && (
									<div className="flex items-center gap-1">
										{a.isLead ? (
											<Button
												variant="ghost"
												size="xs"
												onClick={() =>
													makeLeadMut.mutate({
														assignmentId: a.id,
														isLead: false,
													})
												}
											>
												Remove lead
											</Button>
										) : (
											<Button
												variant="ghost"
												size="xs"
												leadingIcon={<Star size={12} />}
												onClick={() =>
													makeLeadMut.mutate({
														assignmentId: a.id,
														isLead: true,
													})
												}
											>
												Make lead
											</Button>
										)}
										<Button
											variant="ghost"
											size="xs"
											leadingIcon={<UserMinus size={12} />}
											onClick={async () => {
												const ok = await confirm({
													title: `Remove ${a.staffName} from ${committee?.name}?`,
													tone: "danger",
													confirmLabel: "Delete",
												});
												if (ok) removeMut.mutate(a.id);
											}}
										>
											Remove
										</Button>
									</div>
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
				</>
			)}
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

	const list = useListQuery<StaffType>({
		key: ["staff", conference.slug],
		path: `/api/v1/c/${conference.slug}/staff/_with-committees`,
		params: { page: search.page ?? 1, pageSize: PAGE_SIZE, q: search.q },
	});

	const [editing, setEditing] = useState<Staff | null>(null);
	const [creating, setCreating] = useState(false);

	const rows = list.data?.data ?? [];
	const total = list.data?.pagination?.total ?? 0;

	const cols: Column<StaffType>[] = [
		{
			key: "name",
			header: "Name",
			cell: r => (
				<div className="min-w-0">
					<div className="text-ink font-medium truncate">{r.name}</div>
					<div className="text-xs text-ink-3 truncate">
						{[r.email, r.phone].filter(Boolean).join(" · ") || "No contact info"}
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
			key: "status",
			header: "Status",
			cell: r => (
				<Badge size="xs" variant={r.status === "active" ? "accent" : "neutral"}>
					{humanise(r.status)}
				</Badge>
			),
			width: "w-28",
		},
		{
			key: "gender",
			header: "Gender",
			cell: r => <span className="text-xs text-ink-2">{humanise(r.gender)}</span>,
			width: "w-24",
		},
		{
			key: "committees",
			header: "Committees",
			cell: r => (
				<div className="flex flex-wrap gap-1">
					{[...(r.committees ?? [])]
						.sort((a, b) => Number(b.isLead) - Number(a.isLead))
						.slice(0, 3)
						.map(c => (
							<Badge key={c.id} size="xs" variant={c.isLead ? "accent" : "neutral"}>
								{c.isLead ? <Star size={10} className="mr-0.5" /> : null}
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
	staff: StaffType | null;
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
			if (isEdit) {
				const body: StaffUpdateInput = staffUpdateSchema.parse({
					name: form.name?.trim(),
					email: form.email?.trim() || undefined,
					phone: form.phone?.trim() || undefined,
					prantha: form.prantha?.trim() || undefined,
					gender: form.gender || undefined,
				});
				return api.patch(`${path}/${staff!.id}`, body);
			}
			const body: StaffCreateInput = staffCreateSchema.parse({
				name: form.name?.trim(),
				email: form.email?.trim() || undefined,
				phone: form.phone?.trim() || undefined,
				prantha: form.prantha?.trim() || undefined,
				gender: form.gender || undefined,
				customFields: {},
			});
			return api.post(path, body);
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
				<FieldRow label="Gender">
					<Select
						value={form.gender ?? ""}
						onChange={e => upd({ gender: (e.target.value || null) as Staff["gender"] })}
					>
						<option value="">—</option>
						{GENDERS.map(g => (
							<option key={g} value={g}>
								{humanise(g)}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Status">
					<Select
						value={form.status ?? ""}
						onChange={e => upd({ status: (e.target.value || null) as Staff["status"] })}
					>
						<option value="">—</option>
						<option value="active">Active</option>
						<option value="inactive">Inactive</option>
						<option value="on_break">On break</option>
						<option value="completed">Completed</option>
					</Select>
				</FieldRow>
				{isEdit && (
					<div className="mt-5">
						<div className="text-xs font-medium text-ink-3 uppercase tracking-wide mb-2">
							Committees
						</div>
						{staff!.committees?.length ? (
							<div className="flex flex-wrap gap-1.5">
								{[...staff!.committees]
									.sort((a, b) => Number(b.isLead) - Number(a.isLead))
									.map(c => (
										<Badge
											key={c.id}
											size="xs"
											variant={c.isLead ? "accent" : "neutral"}
										>
											{c.isLead ? "★ Lead · " : ""}
											{c.name}
										</Badge>
									))}
							</div>
						) : (
							<p className="text-sm text-ink-3">Not assigned to any committee.</p>
						)}
					</div>
				)}
			</div>
		</EntityDrawer>
	);
}
