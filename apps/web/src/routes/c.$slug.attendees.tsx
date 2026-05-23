import { useEffect, useMemo, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { hasRole, useConference } from "@/lib/ConferenceContext";
import { fmtRelative } from "@/lib/format";
import { useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	CheckCircle2,
	CircleX,
	Download,
	Filter,
	ListChecks,
	Pencil,
	Upload,
	UserPlus,
	X,
} from "lucide-react";
import { z } from "zod";

import { Badge, StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useConfirm } from "@/components/ConfirmDialog";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { SearchField } from "@/components/SearchField";
import { useToast } from "@/components/Toast";
import { FilterChip, Toolbar } from "@/components/Toolbar";

const Search = z.object({
	q: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1).optional(),
	category: z.string().optional(),
	gender: z.string().optional(),
	registrationStatus: z.string().optional(),
	checkinStatus: z.string().optional(),
	isVip: z.string().optional(),
});

export const Route = createFileRoute("/c/$slug/attendees")({
	validateSearch: s => Search.parse(s),
	component: AttendeesPage,
});

type Attendee = {
	id: string;
	attendeeCode: string;
	name: string;
	email?: string | null;
	phone?: string | null;
	gender?: string | null;
	category?: string | null;
	institution?: string | null;
	designation?: string | null;
	prantha?: string | null;
	city?: string | null;
	state?: string | null;
	registrationStatus?: string | null;
	checkinStatus?: string | null;
	checkedInAt?: string | null;
	isVip?: boolean;
	dietaryPreference?: string | null;
	bloodGroup?: string | null;
	customFields?: Record<string, unknown> | null;
	tags?: string[] | null;
	createdAt: string;
	updatedAt?: string | null;
};

type Stats = {
	total: number;
	registered: number;
	confirmed: number;
	checkedIn: number;
	vip: number;
	male: number;
	female: number;
};

const PAGE_SIZE = 25;

function AttendeesPage() {
	const { conference, membership } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const confirm = useConfirm();
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();
	const canEdit = hasRole(membership, "editor");
	const canAdmin = hasRole(membership, "admin");

	const params = {
		q: search.q,
		page: search.page ?? 1,
		pageSize: PAGE_SIZE,
		category: search.category,
		gender: search.gender,
		registrationStatus: search.registrationStatus,
		checkinStatus: search.checkinStatus,
		isVip: search.isVip,
	};

	const list = useListQuery<Attendee>({
		key: ["attendees", conference.slug],
		path: `/api/v1/c/${conference.slug}/attendees`,
		params,
	});
	const stats = useQuery<Stats>({
		queryKey: ["attendees-stats", conference.slug],
		queryFn: () => api.get<Stats>(`/api/v1/c/${conference.slug}/attendees/stats`),
	});

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [drawerMode, setDrawerMode] = useState<"closed" | "create" | "edit">("closed");
	const [editing, setEditing] = useState<Attendee | null>(null);

	const invalidate = () => {
		qc.invalidateQueries({ queryKey: ["attendees", conference.slug] });
		qc.invalidateQueries({ queryKey: ["attendees-stats", conference.slug] });
		qc.invalidateQueries({ queryKey: ["dashboard", conference.slug] });
	};

	const checkInMut = useMutation({
		mutationFn: (id: string) =>
			api.post(`/api/v1/c/${conference.slug}/attendees/${id}/check-in`, {}),
		onSuccess: () => {
			invalidate();
			toast.success("Checked in");
		},
		onError: (e: any) => toast.error("Could not check in", e.message),
	});
	const checkOutMut = useMutation({
		mutationFn: (id: string) =>
			api.post(`/api/v1/c/${conference.slug}/attendees/${id}/check-out`, {}),
		onSuccess: () => {
			invalidate();
			toast.success("Checked out");
		},
		onError: (e: any) => toast.error("Could not check out", e.message),
	});
	const bulkMut = useMutation({
		mutationFn: (input: { action: string; ids: string[] }) =>
			api.post(`/api/v1/c/${conference.slug}/attendees/bulk-action`, input),
		onSuccess: (_d, input) => {
			invalidate();
			setSelected(new Set());
			toast.success(`${input.action.replace(/_/g, " ")} applied to ${input.ids.length}`);
		},
		onError: (e: any) => toast.error("Bulk action failed", e.message),
	});

	const rows = list.data?.data ?? [];
	const total = list.data?.pagination?.total ?? 0;

	const allOnPageSelected = rows.length > 0 && rows.every(r => selected.has(r.id));

	const columns: Column<Attendee>[] = [
		{
			key: "select",
			header: (
				<input
					type="checkbox"
					checked={allOnPageSelected}
					onChange={e => {
						const next = new Set(selected);
						if (e.target.checked) rows.forEach(r => next.add(r.id));
						else rows.forEach(r => next.delete(r.id));
						setSelected(next);
					}}
					className="size-4 accent-accent"
				/>
			),
			cell: r => (
				<input
					type="checkbox"
					checked={selected.has(r.id)}
					onChange={e => {
						const next = new Set(selected);
						if (e.target.checked) next.add(r.id);
						else next.delete(r.id);

						setSelected(next);
					}}
					onClick={e => e.stopPropagation()}
					className="size-4 accent-accent"
				/>
			),
			width: "w-10",
		},
		{
			key: "code",
			header: "Code",
			cell: r => <span className="font-mono text-[11px] text-ink-2">{r.attendeeCode}</span>,
			width: "w-32",
		},
		{
			key: "name",
			header: "Name",
			cell: r => (
				<div className="min-w-0">
					<div className="flex items-center gap-1.5">
						<span className="text-ink font-medium truncate">{r.name}</span>
						{r.isVip && (
							<Badge size="xs" variant="warn">
								VIP
							</Badge>
						)}
					</div>
					<div className="text-xs text-ink-3 truncate">
						{[r.email, r.phone].filter(Boolean).join(" · ")}
					</div>
				</div>
			),
		},
		{
			key: "registration",
			header: "Registration",
			cell: r => <StatusBadge status={r.registrationStatus} />,
			width: "w-32",
		},
		{
			key: "checkin",
			header: "Check-in",
			cell: r => (
				<div className="flex items-center gap-2">
					<StatusBadge status={r.checkinStatus} />
					{r.checkedInAt && (
						<span className="text-[11px] text-ink-3">{fmtRelative(r.checkedInAt)}</span>
					)}
				</div>
			),
			width: "w-50",
		},
		{
			key: "location",
			header: "Prantha",
			cell: r => (
				<div className="text-xs text-ink-2 truncate">
					{[r.prantha].filter(Boolean).join(" · ") || "—"}
				</div>
			),
			width: "w-58",
		},
		{
			key: "actions",
			header: "Actions",
			cell: r =>
				canEdit && (
					<div className="flex items-center justify-end gap-1">
						{r.checkinStatus === "checked_in" ? (
							<Button
								variant="ghost"
								size="xs"
								onClick={e => {
									e.stopPropagation();
									checkOutMut.mutate(r.id);
								}}
								leadingIcon={<CircleX size={12} />}
							>
								Check out
							</Button>
						) : (
							<Button
								variant="secondary"
								size="xs"
								onClick={e => {
									e.stopPropagation();
									checkInMut.mutate(r.id);
								}}
								leadingIcon={<CheckCircle2 size={12} />}
							>
								Check in
							</Button>
						)}
					</div>
				),
			align: "right",
			width: "w-32",
		},
	];

	const activeFilters = useMemo(() => {
		const f: { key: keyof z.infer<typeof Search>; label: string; value: string }[] = [];
		if (search.category) f.push({ key: "category", label: "Category", value: search.category });
		if (search.gender) f.push({ key: "gender", label: "Gender", value: search.gender });
		if (search.registrationStatus)
			f.push({
				key: "registrationStatus",
				label: "Registration",
				value: search.registrationStatus,
			});
		if (search.checkinStatus)
			f.push({ key: "checkinStatus", label: "Check-in", value: search.checkinStatus });
		if (search.isVip) f.push({ key: "isVip", label: "VIP", value: search.isVip });
		return f;
	}, [search]);

	return (
		<div className="p-6">
			<PageHeader
				title="Attendees"
				description={`${stats.data?.total ?? "—"} total · ${stats.data?.confirmed ?? "—"} confirmed · ${stats.data?.checkedIn ?? "—"} checked in`}
				actions={
					<>
						{canEdit && (
							<Button
								variant="secondary"
								leadingIcon={<Upload size={14} />}
								onClick={() =>
									(window.location.href = `/c/${conference.slug}/imports`)
								}
							>
								Import
							</Button>
						)}
						<Button
							variant="secondary"
							leadingIcon={<Download size={14} />}
							onClick={() => toast.info("Use Reports to download CSV/XLSX")}
						>
							Export
						</Button>
						{canEdit && (
							<Button
								variant="primary"
								leadingIcon={<UserPlus size={14} />}
								onClick={() => {
									setEditing(null);
									setDrawerMode("create");
								}}
							>
								Add attendee
							</Button>
						)}
					</>
				}
			/>

			<Card pad="sm">
				<Toolbar
					left={
						<>
							<SearchField
								value={search.q ?? ""}
								onChange={q => setSearch({ q, page: 1 })}
								placeholder="Search by name, email, phone, code..."
								className="min-w-90"
							/>
							<FilterDropdown search={search} setSearch={setSearch} />
							{activeFilters.map(f => (
								<FilterChip
									key={f.key}
									label={f.label}
									value={f.value}
									onClear={() =>
										setSearch({ [f.key]: undefined, page: 1 } as any)
									}
								/>
							))}
						</>
					}
					right={
						selected.size > 0 ? (
							<BulkActionsMenu
								selectedCount={selected.size}
								canAdmin={canAdmin}
								onAction={async action => {
									if (action === "delete") {
										const ok = await confirm({
											title: `Delete ${selected.size} attendee(s)?`,
											description:
												"They will be soft-deleted and recoverable from the audit log.",
											tone: "danger",
											confirmLabel: "Delete",
										});
										if (!ok) return;
									}
									bulkMut.mutate({ action, ids: Array.from(selected) });
								}}
								onClear={() => setSelected(new Set())}
							/>
						) : (
							<span className="text-xs text-ink-3">
								{rows.length > 0 && `Showing ${rows.length} of ${total}`}
							</span>
						)
					}
				/>

				<DataTable
					columns={columns}
					rows={rows}
					loading={list.isLoading}
					onRowClick={r => {
						setEditing(r);
						setDrawerMode("edit");
					}}
					selectedKey={editing?.id ?? null}
					emptyTitle="No attendees yet"
					emptyHint="Add one above or run an import."
				/>
				<Pagination
					page={search.page ?? 1}
					pageSize={PAGE_SIZE}
					total={total}
					onChange={p => setSearch({ page: p })}
				/>
			</Card>

			<AttendeeDrawer
				mode={drawerMode}
				attendee={editing}
				onClose={() => setDrawerMode("closed")}
				onSaved={invalidate}
			/>
		</div>
	);
}

function FilterDropdown({
	search,
	setSearch,
}: {
	search: z.infer<typeof Search>;
	setSearch: (p: Partial<z.infer<typeof Search>>) => void;
}) {
	const [open, setOpen] = useState(false);
	return (
		<>
			<Button
				variant="ghost"
				size="sm"
				leadingIcon={<Filter size={13} />}
				onClick={() => setOpen(true)}
			>
				Filters
			</Button>
			<EntityDrawer
				open={open}
				onOpenChange={setOpen}
				title="Filter attendees"
				width="sm"
				footer={
					<>
						<Button
							variant="ghost"
							onClick={() => {
								setSearch({
									category: undefined,
									gender: undefined,
									registrationStatus: undefined,
									checkinStatus: undefined,
									isVip: undefined,
									page: 1,
								});
								setOpen(false);
							}}
						>
							Clear all
						</Button>
						<Button variant="primary" onClick={() => setOpen(false)}>
							Done
						</Button>
					</>
				}
			>
				<div className="space-y-4">
					<FieldRow label="Category">
						<Select
							value={search.category ?? ""}
							onChange={e =>
								setSearch({ category: e.target.value || undefined, page: 1 })
							}
						>
							<option value="">Any</option>
							{[
								"delegate",
								"speaker",
								"keynote",
								"vip",
								"sponsor",
								"organiser",
								"student",
								"faculty",
								"media",
								"observer",
							].map(c => (
								<option key={c} value={c}>
									{c}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="Gender">
						<Select
							value={search.gender ?? ""}
							onChange={e =>
								setSearch({ gender: e.target.value || undefined, page: 1 })
							}
						>
							<option value="">Any</option>
							<option value="male">Male</option>
							<option value="female">Female</option>
							<option value="other">Other</option>
							<option value="prefer_not_to_say">Prefer not to say</option>
						</Select>
					</FieldRow>
					<FieldRow label="Registration status">
						<Select
							value={search.registrationStatus ?? ""}
							onChange={e =>
								setSearch({
									registrationStatus: e.target.value || undefined,
									page: 1,
								})
							}
						>
							<option value="">Any</option>
							{["pending", "registered", "confirmed", "cancelled", "waitlisted"].map(
								c => (
									<option key={c} value={c}>
										{c}
									</option>
								),
							)}
						</Select>
					</FieldRow>
					<FieldRow label="Check-in status">
						<Select
							value={search.checkinStatus ?? ""}
							onChange={e =>
								setSearch({ checkinStatus: e.target.value || undefined, page: 1 })
							}
						>
							<option value="">Any</option>
							{["not_checked_in", "checked_in", "checked_out", "no_show"].map(c => (
								<option key={c} value={c}>
									{c.replace(/_/g, " ")}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="VIP">
						<Select
							value={search.isVip ?? ""}
							onChange={e =>
								setSearch({ isVip: e.target.value || undefined, page: 1 })
							}
						>
							<option value="">Any</option>
							<option value="true">VIP only</option>
							<option value="false">Non-VIP only</option>
						</Select>
					</FieldRow>
				</div>
			</EntityDrawer>
		</>
	);
}

function BulkActionsMenu({
	selectedCount,
	canAdmin,
	onAction,
	onClear,
}: {
	selectedCount: number;
	canAdmin: boolean;
	onAction: (action: string) => void;
	onClear: () => void;
}) {
	const [open, setOpen] = useState(false);
	const actions: { value: string; label: string; tone?: "danger" | "primary" }[] = [
		{ value: "check_in", label: "Check in" },
		{ value: "check_out", label: "Check out" },
		{ value: "confirm", label: "Mark confirmed" },
		{ value: "cancel", label: "Mark cancelled" },
		{ value: "mark_badge_printed", label: "Mark badge printed" },
		{ value: "mark_kit_collected", label: "Mark kit collected" },
	];
	if (canAdmin) actions.push({ value: "delete", label: "Delete (soft)", tone: "danger" });

	return (
		<>
			<Badge variant="accent">{selectedCount} selected</Badge>
			<Button variant="ghost" size="sm" onClick={onClear} leadingIcon={<X size={12} />}>
				Clear
			</Button>
			<Button
				variant="primary"
				size="sm"
				leadingIcon={<ListChecks size={13} />}
				onClick={() => setOpen(true)}
			>
				Bulk action
			</Button>
			<EntityDrawer
				open={open}
				onOpenChange={setOpen}
				title="Apply bulk action"
				subtitle={`${selectedCount} attendee(s) selected`}
				width="sm"
			>
				<div className="flex flex-col gap-2">
					{actions.map(a => (
						<button
							key={a.value}
							onClick={() => {
								setOpen(false);
								onAction(a.value);
							}}
							className={`text-left h-9 px-3 rounded-md border border-line hover:bg-surface-2 text-sm ${
								a.tone === "danger" ? "text-danger-soft-fg" : "text-ink"
							}`}
						>
							{a.label}
						</button>
					))}
				</div>
			</EntityDrawer>
		</>
	);
}

type Mode = "closed" | "create" | "edit";

function AttendeeDrawer({
	mode,
	attendee,
	onClose,
	onSaved,
}: {
	mode: Mode;
	attendee: Attendee | null;
	onClose: () => void;
	onSaved: () => void;
}) {
	const { conference } = useConference();
	const toast = useToast();
	const isEdit = mode === "edit";

	const initial: Partial<Attendee> = isEdit ? (attendee ?? {}) : {};
	const [form, setForm] = useState<Partial<Attendee>>(initial);

	useEffect(() => {
		const nextInitial: Partial<Attendee> = isEdit ? (attendee ?? {}) : {};
		setForm(nextInitial);
	}, [attendee, mode, isEdit]);

	const save = useMutation({
		mutationFn: async () => {
			const path = `/api/v1/c/${conference.slug}/attendees`;
			if (isEdit && attendee) {
				return api.patch<{ data: Attendee }>(`${path}/${attendee.id}`, cleanForApi(form));
			}
			return api.post<{ data: Attendee }>(path, cleanForApi(form));
		},
		onSuccess: () => {
			onSaved();
			onClose();
			toast.success(isEdit ? "Attendee updated" : "Attendee added");
		},
		onError: (err: any) => {
			if (err instanceof ApiError && err.details && typeof err.details === "object") {
				toast.error("Validation failed", JSON.stringify(err.details));
			} else {
				toast.error("Save failed", err.message);
			}
		},
	});

	const update = (patch: Partial<Attendee>) => setForm(p => ({ ...p, ...patch }));

	return (
		<EntityDrawer
			open={mode !== "closed"}
			onOpenChange={v => !v && onClose()}
			title={isEdit ? (form.name ?? "Attendee") : "Add attendee"}
			subtitle={isEdit ? attendee?.attendeeCode : "New record: code will be auto-assigned"}
			status={
				isEdit && attendee ? (
					<StatusBadge status={attendee.registrationStatus} />
				) : undefined
			}
			width="lg"
			footer={
				<>
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button
						variant="primary"
						loading={save.isPending}
						leadingIcon={<Pencil size={13} />}
						onClick={() => save.mutate()}
					>
						{isEdit ? "Save changes" : "Create"}
					</Button>
				</>
			}
		>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<FieldRow label="Name" required>
					<Input
						value={form.name ?? ""}
						onChange={e => update({ name: e.target.value })}
						placeholder="Full name"
					/>
				</FieldRow>
				<FieldRow label="Email">
					<Input
						type="email"
						value={form.email ?? ""}
						onChange={e => update({ email: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Phone">
					<Input
						value={form.phone ?? ""}
						onChange={e => update({ phone: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Gender">
					<Select
						value={form.gender ?? ""}
						onChange={e => update({ gender: e.target.value || null })}
					>
						<option value="">—</option>
						<option value="male">Male</option>
						<option value="female">Female</option>
						<option value="other">Other</option>
						<option value="prefer_not_to_say">Prefer not to say</option>
					</Select>
				</FieldRow>
				<FieldRow label="Category">
					<Select
						value={form.category ?? ""}
						onChange={e => update({ category: e.target.value || null })}
					>
						<option value="">—</option>
						{[
							"delegate",
							"speaker",
							"keynote",
							"vip",
							"sponsor",
							"organiser",
							"student",
							"faculty",
							"media",
							"observer",
						].map(c => (
							<option key={c} value={c}>
								{c}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Registration status">
					<Select
						value={form.registrationStatus ?? ""}
						onChange={e => update({ registrationStatus: e.target.value || null })}
					>
						<option value="">—</option>
						{["pending", "registered", "confirmed", "cancelled", "waitlisted"].map(
							c => (
								<option key={c} value={c}>
									{c}
								</option>
							),
						)}
					</Select>
				</FieldRow>
				<FieldRow label="Institution">
					<Input
						value={form.institution ?? ""}
						onChange={e => update({ institution: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Designation">
					<Input
						value={form.designation ?? ""}
						onChange={e => update({ designation: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Prantha">
					<Input
						value={form.prantha ?? ""}
						onChange={e => update({ prantha: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="City">
					<Input
						value={form.city ?? ""}
						onChange={e => update({ city: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="State">
					<Input
						value={form.state ?? ""}
						onChange={e => update({ state: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Dietary preference">
					<Select
						value={form.dietaryPreference ?? ""}
						onChange={e => update({ dietaryPreference: e.target.value || null })}
					>
						<option value="">—</option>
						<option value="veg">Veg</option>
						<option value="non_veg">Non-veg</option>
						<option value="vegan">Vegan</option>
						<option value="jain">Jain</option>
						<option value="no_onion_garlic">No onion/garlic</option>
						<option value="special">Special</option>
					</Select>
				</FieldRow>
				<FieldRow label="Blood group">
					<Select
						value={form.bloodGroup ?? ""}
						onChange={e => update({ bloodGroup: e.target.value || null })}
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
				<FieldRow label="VIP">
					<Select
						value={form.isVip ? "true" : "false"}
						onChange={e => update({ isVip: e.target.value === "true" })}
					>
						<option value="false">No</option>
						<option value="true">Yes</option>
					</Select>
				</FieldRow>
				<FieldRow label="Tags (comma-separated)" className="sm:col-span-2">
					<Input
						value={(form.tags ?? []).join(", ")}
						onChange={e =>
							update({
								tags: e.target.value
									.split(",")
									.map(s => s.trim())
									.filter(Boolean),
							})
						}
						placeholder="day1, vip-dinner"
					/>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}

function cleanForApi(o: Partial<Attendee>): Partial<Attendee> {
	const out: any = {};
	for (const [k, v] of Object.entries(o)) {
		if (v === "" || v === undefined) continue;
		out[k] = v;
	}
	return out;
}
