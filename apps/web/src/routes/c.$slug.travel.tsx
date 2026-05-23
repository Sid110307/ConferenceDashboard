import { useMemo, useState } from "react";

import { api } from "@/lib/api";
import { hasRole, useConference } from "@/lib/ConferenceContext";
import { fmtDateTime } from "@/lib/format";
import { useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Bus, Filter, Plane, Truck } from "lucide-react";
import { z } from "zod";

import { Badge, StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { SearchField } from "@/components/SearchField";
import { Tabs } from "@/components/Tabs";
import { useToast } from "@/components/Toast";
import { FilterChip, Toolbar } from "@/components/Toolbar";

const Search = z.object({
	q: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1).optional(),
	direction: z.enum(["arrival", "departure"]).default("arrival").optional(),
	gender: z.string().optional(),
	pickupStatus: z.string().optional(),
	vehicleId: z.string().optional(),
	date: z.string().optional(),
});

export const Route = createFileRoute("/c/$slug/travel")({
	validateSearch: s => Search.parse(s),
	component: TravelPage,
});

type Segment = {
	id: string;
	attendeeId: string;
	attendeeName: string;
	attendeeCode: string;
	gender?: string | null;
	phone?: string | null;
	direction: "arrival" | "departure";
	travelMode?: string | null;
	carrier?: string | null;
	serviceNumber?: string | null;
	originCity?: string | null;
	destinationCity?: string | null;
	scheduledTime?: string | null;
	pickupStatus?: string | null;
	vehicleId?: string | null;
	vehicleLabel?: string | null;
	driverName?: string | null;
	driverPhone?: string | null;
	notes?: string | null;
};

type Vehicle = {
	id: string;
	label: string;
	plateNumber?: string | null;
	driverName?: string | null;
	driverPhone?: string | null;
	capacity?: number | null;
	status?: string | null;
};

const PAGE_SIZE = 25;

function TravelPage() {
	const { conference, membership } = useConference();
	const canEdit = hasRole(membership, "editor");
	const qc = useQueryClient();
	const toast = useToast();
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();
	const direction = search.direction ?? "arrival";

	const list = useListQuery<Segment>({
		key: ["travel", conference.slug],
		path: `/api/v1/c/${conference.slug}/travel`,
		params: {
			page: search.page ?? 1,
			pageSize: PAGE_SIZE,
			direction,
			gender: search.gender,
			pickupStatus: search.pickupStatus,
			vehicleId: search.vehicleId,
			date: search.date,
			q: search.q,
		},
	});
	const vehicles = useQuery<{ data: Vehicle[] }>({
		queryKey: ["vehicles", conference.slug],
		queryFn: () =>
			api.get<{ data: Vehicle[] }>(`/api/v1/c/${conference.slug}/vehicles`, {
				pageSize: 200,
			}),
	});

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [assignOpen, setAssignOpen] = useState(false);

	const assignMut = useMutation({
		mutationFn: (input: { segmentIds: string[]; vehicleId: string }) =>
			api.post(`/api/v1/c/${conference.slug}/travel/assign-vehicle`, input),
		onSuccess: (_d, input) => {
			qc.invalidateQueries({ queryKey: ["travel", conference.slug] });
			setSelected(new Set());
			setAssignOpen(false);
			toast.success(`Assigned ${input.segmentIds.length} segments`);
		},
		onError: (e: any) => toast.error("Assignment failed", e.message),
	});

	const rows = list.data?.data ?? [];
	const total = list.data?.pagination?.total ?? 0;
	const allOnPageSelected = rows.length > 0 && rows.every(r => selected.has(r.id));

	const cols: Column<Segment>[] = [
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
			key: "time",
			header: direction === "arrival" ? "Arrival time" : "Departure time",
			cell: r => (
				<span className="text-xs tabular-nums text-ink">
					{fmtDateTime(r.scheduledTime)}
				</span>
			),
			width: "w-44",
		},
		{
			key: "attendee",
			header: "Attendee",
			cell: r => (
				<div className="min-w-0">
					<div className="text-ink truncate">{r.attendeeName}</div>
					<div className="text-xs text-ink-3">
						<span className="font-mono">{r.attendeeCode}</span>
						{r.gender && <> · {r.gender}</>}
						{r.phone && <> · {r.phone}</>}
					</div>
				</div>
			),
		},
		{
			key: "mode",
			header: "Mode",
			cell: r => (
				<div className="text-xs text-ink-2">
					<span className="inline-flex items-center gap-1.5">
						{r.travelMode === "flight" && <Plane size={12} />}
						{r.travelMode === "train" && <Bus size={12} />}
						<span className="capitalize">{r.travelMode ?? "—"}</span>
					</span>
					{r.carrier && (
						<div className="text-[11px] text-ink-3">
							{r.carrier} {r.serviceNumber}
						</div>
					)}
				</div>
			),
			width: "w-36",
		},
		{
			key: "route",
			header: direction === "arrival" ? "From" : "To",
			cell: r => (
				<span className="text-xs text-ink-2">
					{direction === "arrival" ? r.originCity : r.destinationCity}
				</span>
			),
			width: "w-36",
		},
		{
			key: "vehicle",
			header: "Vehicle",
			cell: r =>
				r.vehicleLabel ? (
					<div className="text-xs">
						<div className="text-ink">{r.vehicleLabel}</div>
						{r.driverName && (
							<div className="text-ink-3 text-[11px]">
								{r.driverName} · {r.driverPhone}
							</div>
						)}
					</div>
				) : (
					<Badge variant="outline" size="sm">
						Unassigned
					</Badge>
				),
			width: "w-44",
		},
		{
			key: "status",
			header: "Status",
			cell: r => <StatusBadge status={r.pickupStatus} />,
			width: "w-32",
		},
	];

	const activeFilters = useMemo(() => {
		const f: { key: keyof z.infer<typeof Search>; label: string; value: string }[] = [];
		if (search.gender) f.push({ key: "gender", label: "Gender", value: search.gender });
		if (search.pickupStatus)
			f.push({ key: "pickupStatus", label: "Status", value: search.pickupStatus });
		if (search.vehicleId) {
			const v = vehicles.data?.data.find(x => x.id === search.vehicleId);
			f.push({ key: "vehicleId", label: "Vehicle", value: v?.label ?? "—" });
		}
		if (search.date) f.push({ key: "date", label: "Date", value: search.date });
		return f;
	}, [search, vehicles.data]);

	return (
		<div className="p-6">
			<PageHeader
				title="Travel"
				description="Arrival and departure manifests with vehicle dispatch."
				actions={
					canEdit && (
						<Button
							variant="primary"
							leadingIcon={<Truck size={14} />}
							onClick={() =>
								(window.location.href = `/c/${conference.slug}/travel/vehicles`)
							}
						>
							Manage vehicles
						</Button>
					)
				}
			/>

			<Tabs
				value={direction}
				onValueChange={v => setSearch({ direction: v as any, page: 1 })}
				items={[
					{ value: "arrival", label: "Arrivals", content: null },
					{ value: "departure", label: "Departures", content: null },
				]}
			/>

			<Card pad="sm">
				<Toolbar
					left={
						<>
							<SearchField
								value={search.q ?? ""}
								onChange={q => setSearch({ q, page: 1 })}
								placeholder="Search by name, PNR, flight no..."
								className="min-w-90"
							/>
							<FilterBar
								search={search}
								setSearch={setSearch}
								vehicles={vehicles.data?.data ?? []}
							/>
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
							<>
								<Badge variant="accent">{selected.size} selected</Badge>
								<Button
									variant="primary"
									size="sm"
									onClick={() => setAssignOpen(true)}
								>
									Assign vehicle
								</Button>
							</>
						) : (
							<span className="text-xs text-ink-3">
								{rows.length > 0 && `Showing ${rows.length} of ${total}`}
							</span>
						)
					}
				/>

				<DataTable
					columns={cols}
					rows={rows}
					loading={list.isLoading}
					emptyTitle={`No ${direction}s found`}
					emptyHint="Try clearing filters or importing a travel manifest."
				/>
				<Pagination
					page={search.page ?? 1}
					pageSize={PAGE_SIZE}
					total={total}
					onChange={p => setSearch({ page: p })}
				/>
			</Card>
			<EntityDrawer
				open={assignOpen}
				onOpenChange={setAssignOpen}
				title="Assign vehicle"
				subtitle={`${selected.size} segments selected`}
				width="sm"
			>
				<div className="space-y-3">
					<p className="text-sm text-ink-2">
						Pick a vehicle below. All selected segments will be assigned and the driver
						list updated automatically.
					</p>
					{(vehicles.data?.data ?? []).map(v => (
						<button
							key={v.id}
							onClick={() =>
								assignMut.mutate({
									segmentIds: Array.from(selected),
									vehicleId: v.id,
								})
							}
							className="w-full text-left p-3 rounded-md border border-line hover:border-accent hover:bg-surface-2 transition-colors"
						>
							<div className="flex items-center justify-between">
								<span className="text-sm font-medium text-ink">{v.label}</span>
								{v.capacity && (
									<Badge variant="outline" size="sm">
										{v.capacity} seats
									</Badge>
								)}
							</div>
							{v.driverName && (
								<div className="mt-0.5 text-xs text-ink-3">
									{v.driverName} · {v.driverPhone}
								</div>
							)}
						</button>
					))}
				</div>
			</EntityDrawer>
		</div>
	);
}

function FilterBar({
	search,
	setSearch,
	vehicles,
}: {
	search: z.infer<typeof Search>;
	setSearch: (p: Partial<z.infer<typeof Search>>) => void;
	vehicles: Vehicle[];
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
			<EntityDrawer open={open} onOpenChange={setOpen} title="Filter travel" width="sm">
				<div className="space-y-4">
					<FieldRow label="Gender (for printed manifests)">
						<Select
							value={search.gender ?? ""}
							onChange={e =>
								setSearch({ gender: e.target.value || undefined, page: 1 })
							}
						>
							<option value="">Any</option>
							<option value="male">Male</option>
							<option value="female">Female</option>
						</Select>
					</FieldRow>
					<FieldRow label="Pickup status">
						<Select
							value={search.pickupStatus ?? ""}
							onChange={e =>
								setSearch({ pickupStatus: e.target.value || undefined, page: 1 })
							}
						>
							<option value="">Any</option>
							{[
								"scheduled",
								"assigned",
								"en_route",
								"arrived",
								"missed",
								"no_show",
							].map(s => (
								<option key={s} value={s}>
									{s.replace(/_/g, " ")}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="Date (YYYY-MM-DD)">
						<Input
							type="date"
							value={search.date ?? ""}
							onChange={e =>
								setSearch({ date: e.target.value || undefined, page: 1 })
							}
						/>
					</FieldRow>
					<FieldRow label="Vehicle">
						<Select
							value={search.vehicleId ?? ""}
							onChange={e =>
								setSearch({ vehicleId: e.target.value || undefined, page: 1 })
							}
						>
							<option value="">Any</option>
							{vehicles.map(v => (
								<option key={v.id} value={v.id}>
									{v.label}
								</option>
							))}
						</Select>
					</FieldRow>
				</div>
			</EntityDrawer>
		</>
	);
}
