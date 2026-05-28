import React, { useEffect, useMemo, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { fmtDateTime, humanise } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import {
	GENDERS,
	PICKUP_STATUSES,
	vehicleCreateSchema,
	vehicleUpdateSchema,
	type Gender,
	type PickupStatus,
	type TravelSegment,
	type Vehicle,
	type VehicleCreateInput,
	type VehicleUpdateInput,
} from "@conference/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	Bus,
	Car,
	CarFront,
	CarTaxiFront,
	Filter,
	Luggage,
	Pencil,
	Plane,
	TrainFront,
} from "lucide-react";
import { z } from "zod";

import { Badge, StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { DatePickerInput } from "@/components/DatePicker";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { SearchField } from "@/components/SearchField";
import { Tabs } from "@/components/Tabs";
import { useToast } from "@/components/Toast";
import { FilterChip, Toolbar } from "@/components/Toolbar";

const Search = z.object({
	q: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1).optional(),
	direction: z.enum(["arrival", "departure"]).default("arrival").optional(),
	gender: z.enum(GENDERS as readonly [Gender, ...Gender[]]).optional(),
	pickupStatus: z.enum(PICKUP_STATUSES as readonly [PickupStatus, ...PickupStatus[]]).optional(),
	vehicleId: z.string().optional(),
	date: z.string().optional(),
});

export const Route = createFileRoute("/c/$slug/travel")({
	validateSearch: s => Search.parse(s),
	component: TravelPage,
});

type Segment = TravelSegment & {
	attendeeName?: string;
	attendeeCode?: string;
	gender?: string | null;
	phone?: string | null;

	vehicleCode?: string | null;
	vehicleLabel?: string | null;
	vehicleType?: string | null;
	plateNumber?: string | null;
	driverName?: string | null;
	driverPhone?: string | null;
};

const PAGE_SIZE = 20;
const TRAVEL_MODE_ICONS: Record<string, React.ReactNode> = {
	flight: <Plane size={13} />,
	train: <TrainFront size={13} />,
	bus: <Bus size={13} />,
	car: <CarFront size={13} />,
	taxi: <CarTaxiFront size={13} />,
	local: <Luggage size={13} />,
	other: <Car size={13} />,
};

function TravelPage() {
	const { conference, membership } = useConference();
	const canEdit = hasAtLeastRole(membership, "editor");
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
		queryKey: queryKeys.vehicles(conference.slug),
		queryFn: () =>
			api.get<{ data: Vehicle[] }>(`/api/v1/c/${conference.slug}/vehicles`, {
				pageSize: 200,
			}),
	});

	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [assignOpen, setAssignOpen] = useState(false);
	const [vehicleDrawerMode, setVehicleDrawerMode] = useState<"closed" | "create" | "edit">(
		"closed",
	);
	const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

	const assignMut = useMutation({
		mutationFn: (input: { segmentIds: string[]; vehicleId: string }) =>
			api.post(`/api/v1/c/${conference.slug}/travel/assign-vehicle`, input),
		onSuccess: (_d, input) => {
			qc.invalidateQueries({ queryKey: queryKeys.travel(conference.slug) }).catch(
				console.error,
			);
			setSelected(new Set());
			setAssignOpen(false);
			toast.success(
				`Assigned ${input.segmentIds.length} segment${input.segmentIds.length > 1 ? "s" : ""}`,
			);
		},
		onError: (e: any) => toast.error("Assignment failed", e.message),
	});

	const rows: Segment[] = list.data?.data ?? [];
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
						{r.gender && <> · {humanise(r.gender)}</>}
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
						{TRAVEL_MODE_ICONS[r.travelMode ?? "other"]}
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
						<div className="text-ink">
							<span className="font-semibold">
								{humanise(r.vehicleType ?? "Vehicle")}
							</span>{" "}
							{r.plateNumber ?? ""}
							{r.driverNameOverride && ` · Driver: ${r.driverNameOverride}`}
						</div>
						{r.driverName && !r.driverNameOverride && (
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
			width: "w-64",
		},
		{
			key: "status",
			header: "Status",
			cell: r => <StatusBadge status={r.pickupStatus} />,
			width: "w-32",
		},
		{
			key: "actions",
			header: "Actions",
			cell: r =>
				canEdit ? (
					<Button
						variant="secondary"
						size="sm"
						onClick={() => {
							setSelected(new Set([r.id]));
							setAssignOpen(true);
						}}
					>
						Manage vehicle
					</Button>
				) : (
					<span className="text-xs text-ink-3">—</span>
				),
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
			f.push({
				key: "vehicleId",
				label: "Vehicle",
				value: `${v?.vehicleType ?? "Vehicle"} ${v?.plateNumber ?? ""}`.trim() ?? "—",
			});
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
							onClick={() => {
								setSelected(new Set());
								setAssignOpen(true);
							}}
							disabled={rows.length === 0}
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
				title="Manage vehicles"
				subtitle={
					selected.size > 0
						? `${selected.size} segment${selected.size === 1 ? "" : "s"} selected`
						: "Select a vehicle to view or edit its details"
				}
				width="sm"
				footer={
					canEdit ? (
						<Button
							variant="secondary"
							size="sm"
							onClick={() => {
								setAssignOpen(false);
								setEditingVehicle(null);
								setVehicleDrawerMode("create");
							}}
						>
							Add vehicle
						</Button>
					) : undefined
				}
			>
				<div className="space-y-3">
					{selected.size > 0 && (
						<p className="text-sm text-ink-2">
							Pick a vehicle below to assign all selected segments to it.
						</p>
					)}
					{(vehicles.data?.data ?? []).map(v => (
						<div key={v.id} className="flex items-stretch gap-2">
							<Card
								onClick={() => {
									if (selected.size > 0) {
										assignMut.mutate({
											segmentIds: Array.from(selected),
											vehicleId: v.id,
										});
										return;
									}
									if (canEdit) {
										setAssignOpen(false);
										setEditingVehicle(v);
										setVehicleDrawerMode("edit");
									}
								}}
								className={`flex-1 text-left ${selected.size > 0 ? "cursor-pointer hover:bg-ink-50 focus-visible:bg-ink-100" : canEdit ? "cursor-pointer hover:bg-surface-2 focus-visible:bg-surface-3" : ""}`}
							>
								<div className="flex items-center justify-between">
									<span className="text-sm font-medium text-ink">
										{v.vehicleType
											? `${humanise(v.vehicleType)} ${v.plateNumber ?? ""}`
											: "Vehicle"}
									</span>
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
							</Card>
							{canEdit && selected.size > 0 && (
								<Button
									variant="ghost"
									size="sm"
									onClick={() => {
										setAssignOpen(false);
										setEditingVehicle(v);
										setVehicleDrawerMode("edit");
									}}
									leadingIcon={<Pencil size={13} />}
									className="px-2"
								/>
							)}
						</div>
					))}
				</div>
			</EntityDrawer>
			<VehicleDrawer
				mode={vehicleDrawerMode}
				vehicle={editingVehicle}
				onClose={() => setVehicleDrawerMode("closed")}
				onSaved={() => {
					qc.invalidateQueries({ queryKey: queryKeys.vehicles(conference.slug) }).catch(
						console.error,
					);
				}}
			/>
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
							onChange={e => {
								const value = e.target.value as Gender | "";
								setSearch({ gender: value || undefined, page: 1 });
							}}
						>
							<option value="">Any</option>
							{GENDERS.map(g => (
								<option key={g} value={g}>
									{g.replace(/_/g, " ")}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="Pickup status">
						<Select
							value={search.pickupStatus ?? ""}
							onChange={e => {
								const value = e.target.value as PickupStatus | "";
								setSearch({ pickupStatus: value || undefined, page: 1 });
							}}
						>
							<option value="">Any</option>
							{PICKUP_STATUSES.map(s => (
								<option key={s} value={s}>
									{s.replace(/_/g, " ")}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="Date (YYYY-MM-DD)">
						<DatePickerInput
							value={search.date ?? ""}
							onChange={e => setSearch({ date: e || undefined, page: 1 })}
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
									{v.vehicleType
										? `${humanise(v.vehicleType)} ${v.plateNumber ?? ""}`
										: "Vehicle"}
									{v.capacity && ` · ${v.capacity} seats`}
									{v.driverName && ` · Driver: ${v.driverName}`}
								</option>
							))}
						</Select>
					</FieldRow>
				</div>
			</EntityDrawer>
		</>
	);
}

type VehicleDrawerProps = {
	mode: "closed" | "create" | "edit";
	vehicle: Vehicle | null;
	onClose: () => void;
	onSaved: () => void;
};

function VehicleDrawer({ mode, vehicle, onClose, onSaved }: VehicleDrawerProps) {
	const { conference } = useConference();
	const toast = useToast();
	const qc = useQueryClient();
	const isEdit = mode === "edit";

	const initial: Partial<Vehicle> = isEdit ? (vehicle ?? {}) : {};
	const [form, setForm] = useState<Partial<Vehicle>>(initial);

	useEffect(() => {
		const nextInitial: Partial<Vehicle> = isEdit ? (vehicle ?? {}) : {};
		setForm(nextInitial);
	}, [vehicle, mode, isEdit]);

	const save = useMutation({
		mutationFn: async () => {
			const path = `/api/v1/c/${conference.slug}/vehicles`;
			if (isEdit && vehicle) {
				const payload: VehicleUpdateInput = vehicleUpdateSchema.parse(cleanForApi(form));
				return api.patch<{ data: Vehicle }>(`${path}/${vehicle.id}`, payload);
			}
			const payload: VehicleCreateInput = vehicleCreateSchema.parse(cleanForApi(form));
			return api.post<{ data: Vehicle }>(path, payload);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.vehicles(conference.slug) }).catch(
				console.error,
			);
			onSaved();
			onClose();
			toast.success(isEdit ? "Vehicle updated" : "Vehicle added");
		},
		onError: (err: any) => {
			if (err instanceof ApiError && err.details && typeof err.details === "object") {
				toast.error("Validation failed", JSON.stringify(err.details));
			} else if (err instanceof z.ZodError) {
				toast.error("Validation failed", err.issues.map(i => i.message).join(", "));
			} else {
				toast.error("Save failed", err.message);
			}
		},
	});

	const update = (patch: Partial<Vehicle>) => setForm(p => ({ ...p, ...patch }));

	return (
		<EntityDrawer
			open={mode !== "closed"}
			onOpenChange={v => !v && onClose()}
			title={isEdit ? (form.vehicleCode ?? "Vehicle") : "Add vehicle"}
			subtitle={
				isEdit
					? `${form.vehicleType ?? "Vehicle"} ${form.plateNumber ?? ""}`
					: "New vehicle"
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
				<FieldRow label="Vehicle code">
					<Input
						value={form.vehicleCode ?? ""}
						onChange={e => update({ vehicleCode: e.target.value })}
						placeholder="e.g. VH-001"
					/>
				</FieldRow>
				<FieldRow label="Vehicle type">
					<Input
						value={form.vehicleType ?? ""}
						onChange={e => update({ vehicleType: e.target.value })}
						placeholder="e.g. Car, Bus, SUV"
					/>
				</FieldRow>
				<FieldRow label="Plate number">
					<Input
						value={form.plateNumber ?? ""}
						onChange={e => update({ plateNumber: e.target.value })}
						placeholder="License plate"
					/>
				</FieldRow>
				<FieldRow label="Capacity">
					<Input
						type="number"
						value={form.capacity?.toString() ?? "4"}
						onChange={e => update({ capacity: parseInt(e.target.value) || 4 })}
						min="1"
						max="60"
					/>
				</FieldRow>
				<FieldRow label="Make">
					<Input
						value={form.make ?? ""}
						onChange={e => update({ make: e.target.value })}
						placeholder="Vehicle make"
					/>
				</FieldRow>
				<FieldRow label="Model">
					<Input
						value={form.model ?? ""}
						onChange={e => update({ model: e.target.value })}
						placeholder="Vehicle model"
					/>
				</FieldRow>
				<FieldRow label="Driver name">
					<Input
						value={form.driverName ?? ""}
						onChange={e => update({ driverName: e.target.value })}
						placeholder="Full name"
					/>
				</FieldRow>
				<FieldRow label="Driver phone">
					<Input
						type="tel"
						value={form.driverPhone ?? ""}
						onChange={e => update({ driverPhone: e.target.value })}
						placeholder="Phone number"
					/>
				</FieldRow>
				<FieldRow label="Driver license">
					<Input
						value={form.driverLicense ?? ""}
						onChange={e => update({ driverLicense: e.target.value })}
						placeholder="License number"
					/>
				</FieldRow>
				<FieldRow label="External vehicle">
					<Select
						value={form.isExternal ? "true" : "false"}
						onChange={e => update({ isExternal: e.target.value === "true" })}
					>
						<option value="false">No</option>
						<option value="true">Yes</option>
					</Select>
				</FieldRow>
				{form.isExternal && (
					<>
						<FieldRow label="Vendor name">
							<Input
								value={form.vendorName ?? ""}
								onChange={e => update({ vendorName: e.target.value })}
								placeholder="Vendor name"
							/>
						</FieldRow>
						<FieldRow label="Vendor contact">
							<Input
								value={form.vendorContact ?? ""}
								onChange={e => update({ vendorContact: e.target.value })}
								placeholder="Contact information"
							/>
						</FieldRow>
						<FieldRow label="Rate per day">
							<Input
								type="number"
								value={form.ratePerDay ?? ""}
								onChange={e => update({ ratePerDay: e.target.value })}
								placeholder="0.00"
								step="0.01"
							/>
						</FieldRow>
					</>
				)}
				<FieldRow label="Notes" className="sm:col-span-2">
					<Textarea
						value={form.notes ?? ""}
						onChange={e => update({ notes: e.target.value })}
						placeholder="Additional notes"
						rows={3}
					/>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}

function cleanForApi(o: Partial<Vehicle>): Partial<Vehicle> {
	const out: any = {};
	for (const [k, v] of Object.entries(o)) {
		if (v === "" || v === undefined) continue;
		if (k === "ratePerDay" && typeof v === "string") {
			const num = parseFloat(v);
			if (isNaN(num)) continue;
			out[k] = num;
			continue;
		}
		out[k] = v;
	}
	return out;
}
