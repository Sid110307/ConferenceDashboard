import { useEffect, useMemo, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { fmtDateTime, fmtRelative, humanise } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { PaginationType, useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import { Allocation } from "@/routes/c.$slug.accommodation";
import {
	ATTENDEE_CATEGORIES,
	attendeeCreateSchema,
	attendeeListQuerySchema,
	attendeeUpdateSchema,
	DIET_PREFERENCES,
	GENDERS,
	type Attendee,
	type AttendeeBulkActionInput,
	type AttendeeCreateInput,
	type AttendeeListQuery,
	type AttendeeUpdateInput,
} from "@conference/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	CheckCircle2,
	CircleX,
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
import { CustomFieldsSection } from "@/components/CustomFieldsSection";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { SearchField } from "@/components/SearchField";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/components/Toast";
import { FilterChip, Toolbar } from "@/components/Toolbar";

const Search = z.object({
	...attendeeListQuerySchema.shape,
	page: z.coerce.number().int().min(1).default(1).optional(),
});

export const Route = createFileRoute("/c/$slug/attendees")({
	validateSearch: s => Search.parse(s),
	component: AttendeesPage,
});

type Stats = {
	total: number;
	registered: number;
	confirmed: number;
	checkedIn: number;
	vip: number;
	male: number;
	female: number;
	students: number;
	faculty: number;
	speakers: number;
	badgePrinted: number;
	kitCollected: number;
};

type TravelManifestEntry = {
	id: string;
	attendeeId: string;
	travelMode?: string | null;
	originCity?: string | null;
	destinationCity?: string | null;
	scheduledTime?: string | null;
	pickupStatus?: string | null;
	vehicleCode?: string | null;
	vehiclePlate?: string | null;
	driverName?: string | null;
};

const PAGE_SIZE = 20;

function AttendeesPage() {
	const { conference, membership } = useConference();
	const navigate = useNavigate();
	const qc = useQueryClient();
	const toast = useToast();
	const confirm = useConfirm();
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();
	const canEdit = hasAtLeastRole(membership, "editor");
	const canAdmin = hasAtLeastRole(membership, "admin");

	const params: AttendeeListQuery & Partial<PaginationType> = {
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
	const stats = useQuery<{ data: Stats }>({
		queryKey: queryKeys.attendeesStats(conference.slug),
		queryFn: () => api.get<{ data: Stats }>(`/api/v1/c/${conference.slug}/attendees/stats`),
	});
	const arrivalManifest = useQuery<{ data: TravelManifestEntry[] }>({
		queryKey: queryKeys.travelManifest(conference.slug, "arrival"),
		queryFn: () =>
			api.get<{ data: TravelManifestEntry[] }>(
				`/api/v1/c/${conference.slug}/travel/manifest`,
				{ direction: "arrival" },
			),
	});
	const departureManifest = useQuery<{ data: TravelManifestEntry[] }>({
		queryKey: queryKeys.travelManifest(conference.slug, "departure"),
		queryFn: () =>
			api.get<{ data: TravelManifestEntry[] }>(
				`/api/v1/c/${conference.slug}/travel/manifest`,
				{ direction: "departure" },
			),
	});
	const accommodationAllocations = useQuery<{ data: Allocation[] }>({
		queryKey: queryKeys.accommodationAllocations(conference.slug),
		queryFn: () =>
			api.get<{ data: Allocation[] }>(
				`/api/v1/c/${conference.slug}/accommodation/allocations`,
			),
	});

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [drawerMode, setDrawerMode] = useState<"closed" | "create" | "edit">("closed");
	const [editing, setEditing] = useState<Attendee | null>(null);

	const invalidate = () => {
		qc.invalidateQueries({ queryKey: queryKeys.attendees(conference.slug) }).catch(
			console.error,
		);
		qc.invalidateQueries({ queryKey: queryKeys.attendeesStats(conference.slug) }).catch(
			console.error,
		);
		qc.invalidateQueries({ queryKey: queryKeys.dashboard(conference.slug) }).catch(
			console.error,
		);
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
		mutationFn: (input: AttendeeBulkActionInput) =>
			api.post(`/api/v1/c/${conference.slug}/attendees/bulk-action`, input),
		onSuccess: (_d, input) => {
			invalidate();
			setSelected(new Set());
			toast.success(
				(() => {
					switch (input.action) {
						case "check_in":
							return `Checked in ${input.ids.length} attendee(s)`;
						case "check_out":
							return `Checked out ${input.ids.length} attendee(s)`;
						case "confirm":
							return `Registered ${input.ids.length} attendee(s)`;
						case "cancel":
							return `Cancelled registration for ${input.ids.length} attendee(s)`;
						case "mark_badge_printed":
							return `Marked badge printed for ${input.ids.length} attendee(s)`;
						case "mark_kit_collected":
							return `Marked kit collected for ${input.ids.length} attendee(s)`;
						case "delete":
							return `Deleted ${input.ids.length} attendee(s)`;
						case "restore":
							return `Restored ${input.ids.length} attendee(s)`;
					}
				})(),
			);
		},
		onError: (e: any) => toast.error("Bulk action failed", e.message),
	});

	const rows: Attendee[] = (list.data?.data ?? []) as Attendee[];
	const total = list.data?.pagination?.total ?? 0;

	useEffect(() => {
		setSelected(new Set());
	}, [
		search.q,
		search.page,
		search.category,
		search.gender,
		search.registrationStatus,
		search.checkinStatus,
		search.isVip,
	]);

	const arrivalByAttendee = useMemo(() => {
		const out = new Map<string, TravelManifestEntry>();
		for (const segment of arrivalManifest.data?.data ?? []) {
			if (!out.has(segment.attendeeId)) out.set(segment.attendeeId, segment);
		}
		return out;
	}, [arrivalManifest.data]);
	const departureByAttendee = useMemo(() => {
		const out = new Map<string, TravelManifestEntry>();
		for (const segment of departureManifest.data?.data ?? []) {
			if (!out.has(segment.attendeeId)) out.set(segment.attendeeId, segment);
		}
		return out;
	}, [departureManifest.data]);
	const accommodationByAttendee = useMemo(() => {
		const out = new Map<string, Allocation>();
		const priority = (status: Allocation["status"]) => {
			if (status === "checked_in") return 0;
			if (status === "pending") return 1;
			return 2;
		};
		for (const allocation of accommodationAllocations.data?.data ?? []) {
			const prev = out.get(allocation.attendeeId);
			if (!prev || priority(allocation.status) < priority(prev.status)) {
				out.set(allocation.attendeeId, allocation);
			}
		}
		return out;
	}, [accommodationAllocations.data]);

	const allOnPageSelected = rows.every(r => selected.has(r.id)) && rows.length > 0;
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
			width: "w-48",
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
			width: "w-64",
		},
		{
			key: "prantha",
			header: "Prantha",
			cell: r => <div className="text-xs text-ink-2 truncate">{r.prantha || "-"}</div>,
			width: "w-58",
		},
		{
			key: "institution",
			header: "Institution",
			cell: r => <div className="text-xs text-ink-2 truncate">{r.institution || "-"}</div>,
			width: "w-64",
		},
		{
			key: "accommodation",
			header: "Accommodation",
			cell: r => {
				const allocation = accommodationByAttendee.get(r.id);
				if (!allocation) return <span className="text-xs text-ink-3">-</span>;
				return (
					<div
						onClick={e => {
							e.stopPropagation();
							navigate({
								to: `/c/${conference.slug}/accommodation`,
								search: { roomId: allocation.roomId },
							}).catch(console.error);
						}}
						className="text-xs min-w-0 flex flex-col gap-1 cursor-pointer p-2 rounded-md transition-colors hover:bg-surface-3"
					>
						<div className="flex items-center gap-2">
							<StatusBadge status={allocation.status} />
							<span className="text-ink truncate">
								Room {allocation.bedNumber ?? "-"}
							</span>
						</div>
						<div className="text-[11px] text-ink-3 truncate">
							{allocation.checkinAt && ` · ${fmtRelative(allocation.checkinAt)}`}
						</div>
					</div>
				);
			},
			width: "w-64",
		},
		{
			key: "arrival",
			header: "Arrival Travel",
			cell: r => {
				const segment = arrivalByAttendee.get(r.id);
				if (!segment) return <span className="text-xs text-ink-3">-</span>;
				const details = [
					segment.travelMode ? humanise(segment.travelMode) : null,
					segment.originCity,
				]
					.filter(Boolean)
					.join(" · ");
				return (
					<div
						onClick={e => {
							e.stopPropagation();
							navigate({
								to: `/c/${conference.slug}/travel`,
								search: { q: segment.id, direction: "arrival" },
							}).catch(console.error);
						}}
						className="text-xs min-w-0 flex flex-col gap-1 cursor-pointer p-2 rounded-md transition-colors hover:bg-surface-3"
					>
						<div className="text-ink truncate flex items-center gap-1">
							<StatusBadge status={segment.pickupStatus} />
							{details || "-"}
						</div>
						<div className="text-[11px] text-ink-3">
							{segment.scheduledTime
								? fmtDateTime(segment.scheduledTime)
								: "Time TBD"}
						</div>
					</div>
				);
			},
			width: "w-72",
		},
		{
			key: "departure",
			header: "Departure Travel",
			cell: r => {
				const segment = departureByAttendee.get(r.id);
				if (!segment) return <span className="text-xs text-ink-3">-</span>;
				const details = [
					segment.travelMode ? humanise(segment.travelMode) : null,
					segment.destinationCity,
				]
					.filter(Boolean)
					.join(" · ");
				return (
					<div
						onClick={e => {
							e.stopPropagation();
							navigate({
								to: `/c/${conference.slug}/travel`,
								search: { q: segment.id, direction: "departure" },
							}).catch(console.error);
						}}
						className="text-xs min-w-0 flex flex-col gap-1 cursor-pointer p-2 rounded-md transition-colors hover:bg-surface-3"
					>
						<div className="text-ink truncate flex items-center gap-1">
							<StatusBadge status={segment.pickupStatus} />
							{details || "-"}
						</div>
						<div className="text-[11px] text-ink-3">
							{segment.scheduledTime
								? fmtDateTime(segment.scheduledTime)
								: "Time TBD"}
						</div>
					</div>
				);
			},
			width: "w-72",
		},
		{
			key: "vehicle",
			header: "Vehicle",
			cell: r => {
				const segment = arrivalByAttendee.get(r.id) ?? departureByAttendee.get(r.id);
				if (!segment) return <span className="text-xs text-ink-3">-</span>;
				return (
					<div className="text-xs min-w-0 flex flex-col gap-1">
						<div className="text-ink truncate">
							{[segment.vehicleCode, segment.vehiclePlate]
								.filter(Boolean)
								.join(" · ") || "Unassigned"}
						</div>
						<div className="text-[11px] text-ink-3 truncate">
							{segment.driverName || "-"}
						</div>
					</div>
				);
			},
			width: "w-60",
		},
		{
			key: "badgePrinted",
			header: "Badge",
			cell: r => <StatusBadge status={r.badgePrinted ? "printed" : "not_printed"} />,
			width: "w-32",
		},
		{
			key: "kitCollected",
			header: "Kit",
			cell: r => <StatusBadge status={r.kitCollected ? "collected" : "not_collected"} />,
			width: "w-32",
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
								disabled={checkInMut.isPending || checkOutMut.isPending}
								loading={checkOutMut.isPending}
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
								className="font-semibold"
								disabled={checkInMut.isPending || checkOutMut.isPending}
								loading={checkInMut.isPending}
								leadingIcon={<CheckCircle2 size={12} />}
							>
								Check in
							</Button>
						)}
					</div>
				),
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
		if (typeof search.isVip === "boolean") {
			f.push({ key: "isVip", label: "VIP", value: search.isVip ? "Yes" : "No" });
		}
		return f;
	}, [search]);

	return (
		<div className="p-6">
			<PageHeader
				title="Attendees"
				description={`${stats.data?.data?.total ?? "—"} total · ${stats.data?.data?.confirmed ?? "—"} confirmed · ${stats.data?.data?.checkedIn ?? "—"} checked in`}
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
			<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
				<StatCard
					label="Registered"
					value={stats.data?.data?.registered ?? 0}
					tone="neutral"
					onClick={() => setSearch({ registrationStatus: "registered", page: 1 })}
				/>
				<StatCard
					label="Students"
					value={stats.data?.data?.students ?? 0}
					tone="neutral"
					onClick={() => setSearch({ category: "student", page: 1 })}
				/>
				<StatCard
					label="Faculty"
					value={stats.data?.data?.faculty ?? 0}
					tone="neutral"
					onClick={() => setSearch({ category: "faculty", page: 1 })}
				/>
				<StatCard
					label="Speakers"
					value={stats.data?.data?.speakers ?? 0}
					tone="neutral"
					onClick={() => setSearch({ category: "speaker", page: 1 })}
				/>
				<StatCard
					label="Badge printed"
					value={stats.data?.data?.badgePrinted ?? 0}
					hint={`of ${stats.data?.data?.total ?? 0}`}
					tone="accent"
				/>
				<StatCard
					label="Kit collected"
					value={stats.data?.data?.kitCollected ?? 0}
					hint={`of ${stats.data?.data?.total ?? 0}`}
					tone="accent"
				/>
			</div>
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
						if (!canEdit) return;

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
							onChange={e => {
								const value = e.target.value as AttendeeListQuery["category"] | "";
								setSearch({ category: value || undefined, page: 1 });
							}}
						>
							<option value="">Any</option>
							{ATTENDEE_CATEGORIES.map(c => (
								<option key={c} value={c}>
									{humanise(c)}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="Gender">
						<Select
							value={search.gender ?? ""}
							onChange={e => {
								const value = e.target.value as AttendeeListQuery["gender"] | "";
								setSearch({ gender: value || undefined, page: 1 });
							}}
						>
							<option value="">Any</option>
							{GENDERS.map(g => (
								<option key={g} value={g}>
									{humanise(g)}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="Registration status">
						<Select
							value={search.registrationStatus ?? ""}
							onChange={e => {
								const value = e.target.value as
									| AttendeeListQuery["registrationStatus"]
									| "";
								setSearch({
									registrationStatus: value || undefined,
									page: 1,
								});
							}}
						>
							<option value="">Any</option>
							{["registered", "confirmed", "cancelled", "waitlisted", "no_show"].map(
								c => (
									<option key={c} value={c}>
										{humanise(c)}
									</option>
								),
							)}
						</Select>
					</FieldRow>
					<FieldRow label="Check-in status">
						<Select
							value={search.checkinStatus ?? ""}
							onChange={e => {
								const value = e.target.value as
									| AttendeeListQuery["checkinStatus"]
									| "";
								setSearch({ checkinStatus: value || undefined, page: 1 });
							}}
						>
							<option value="">Any</option>
							{["not_checked_in", "checked_in", "checked_out"].map(c => (
								<option key={c} value={c}>
									{humanise(c)}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="VIP">
						<Select
							value={search.isVip === undefined ? "" : String(search.isVip)}
							onChange={e =>
								setSearch({
									isVip:
										e.target.value === ""
											? undefined
											: e.target.value === "true",
									page: 1,
								})
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
	onAction: (action: AttendeeBulkActionInput["action"]) => void;
	onClear: () => void;
}) {
	const [open, setOpen] = useState(false);
	const actions: {
		value: AttendeeBulkActionInput["action"];
		label: string;
		tone?: "danger" | "primary";
	}[] = [
		{ value: "check_in", label: "Check in" },
		{ value: "check_out", label: "Check out" },
		{ value: "confirm", label: "Confirm registration" },
		{ value: "cancel", label: "Cancel registration" },
		{ value: "mark_badge_printed", label: "Mark badge printed" },
		{ value: "mark_kit_collected", label: "Mark kit collected" },
	];
	if (canAdmin) actions.push({ value: "delete", label: "Delete", tone: "danger" });

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
				const payload: AttendeeUpdateInput = attendeeUpdateSchema.parse(cleanForApi(form));
				return api.patch<{ data: Attendee }>(`${path}/${attendee.id}`, payload);
			}
			const payload: AttendeeCreateInput = attendeeCreateSchema.parse(cleanForApi(form));
			return api.post<{ data: Attendee }>(path, payload);
		},
		onSuccess: () => {
			onSaved();
			onClose();
			toast.success(isEdit ? "Attendee updated" : "Attendee added");
		},
		onError: (err: any) => {
			if (err instanceof ApiError && err.details && typeof err.details === "object") {
				toast.error("Validation failed", JSON.stringify(err.details));
			} else if (err instanceof z.ZodError) {
				toast.error(
					"Validation failed",
					err.issues.map(i => `${i.path}: ${i.message}`).join(", "),
				);
			} else {
				toast.error("Save failed", err.message);
			}
		},
	});

	const update = (patch: Partial<Attendee>) =>
		setForm((p: Partial<Attendee>) => ({ ...p, ...patch }));

	return (
		<EntityDrawer
			open={mode !== "closed"}
			onOpenChange={v => !v && onClose()}
			title={isEdit ? (form.name ?? "Attendee") : "Add attendee"}
			subtitle={isEdit ? attendee?.attendeeCode : "New record: code will be auto-assigned"}
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
						onChange={e =>
							update({ gender: (e.target.value || null) as Attendee["gender"] })
						}
					>
						<option value="">—</option>
						{GENDERS.map(g => (
							<option key={g} value={g}>
								{humanise(g)}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Category">
					<Select
						value={form.category ?? ""}
						onChange={e =>
							update({ category: (e.target.value || null) as Attendee["category"] })
						}
					>
						<option value="">—</option>
						{ATTENDEE_CATEGORIES.map(c => (
							<option key={c} value={c}>
								{humanise(c)}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Registration status">
					<Select
						value={form.registrationStatus ?? ""}
						onChange={e =>
							update({
								registrationStatus: (e.target.value ||
									null) as Attendee["registrationStatus"],
							})
						}
					>
						<option value="">—</option>
						{["registered", "confirmed", "cancelled", "waitlisted", "no_show"].map(
							c => (
								<option key={c} value={c}>
									{humanise(c)}
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
				<FieldRow label="Dietary preference">
					<Select
						value={form.dietaryPreference ?? ""}
						onChange={e =>
							update({
								dietaryPreference: (e.target.value ||
									null) as Attendee["dietaryPreference"],
							})
						}
					>
						<option value="">—</option>
						{DIET_PREFERENCES.map(d => (
							<option key={d} value={d}>
								{humanise(d)}
							</option>
						))}
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
								{b
									.toUpperCase()
									.replace("_", "")
									.replace("POS", "+")
									.replace("NEG", "-")}
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
				<FieldRow label="Badge printed">
					<Select
						value={form.badgePrinted ? "true" : "false"}
						onChange={e => update({ badgePrinted: e.target.value === "true" })}
					>
						<option value="false">No</option>
						<option value="true">Yes</option>
					</Select>
				</FieldRow>
				<FieldRow label="Kit collected">
					<Select
						value={form.kitCollected ? "true" : "false"}
						onChange={e => update({ kitCollected: e.target.value === "true" })}
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
				<div className="sm:col-span-2">
					<CustomFieldsSection
						entity="attendees"
						conferenceSlug={conference.slug}
						customFields={form.customFields ?? {}}
						onUpdate={(key, value) =>
							update({
								customFields: {
									...(form.customFields ?? {}),
									[key]: value,
								},
							})
						}
					/>
				</div>
			</div>
		</EntityDrawer>
	);
}

function cleanForApi(o: Partial<Attendee>): Partial<Attendee> {
	const out: any = {};
	for (const [k, v] of Object.entries(o)) {
		if (v === "" || v === undefined) continue;
		if (k === "tags") {
			out[k] = Array.isArray(v) ? v.filter(s => s.trim() !== "") : (v ?? []);
			continue;
		}
		if (k === "customFields") {
			const cleaned: Record<string, unknown> = {};
			for (const [fieldKey, fieldValue] of Object.entries(v as Record<string, unknown>)) {
				if (fieldValue !== "" && fieldValue !== undefined && fieldValue !== null)
					cleaned[fieldKey] = fieldValue;
			}
			if (Object.keys(cleaned).length > 0) {
				out[k] = cleaned;
			}
			continue;
		}
		if (Array.isArray(v)) {
			out[k] = v;
			continue;
		}
		out[k] = v;
	}
	return out;
}
