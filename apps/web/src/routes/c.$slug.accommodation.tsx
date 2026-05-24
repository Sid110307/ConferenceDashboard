import { useEffect, useState } from "react";

import { api } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { fmtRelative, slugify } from "@/lib/format";
import { cx } from "@/lib/uiStyles";
import { useUrlState } from "@/lib/useUrlState";
import {
	accommodationBlockCreateSchema,
	allocationCheckActionSchema,
	type AccommodationBlockInput,
} from "@conference/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Plus, Users } from "lucide-react";
import { z } from "zod";

import { Badge, StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useConfirm } from "@/components/ConfirmDialog";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

const Search = z.object({
	blockId: z.string().optional(),
	roomId: z.string().optional(),
});

export const Route = createFileRoute("/c/$slug/accommodation")({
	validateSearch: s => Search.parse(s),
	component: AccommodationPage,
});

type Block = {
	id: string;
	name: string;
	address?: string | null;
	capacity?: number | null;
	occupiedCount?: number | null;
	roomCount?: number | null;
	notes?: string | null;
};
type Room = {
	id: string;
	blockId: string;
	roomNumber: string;
	floor?: string | null;
	capacity: number;
	occupiedCount: number;
	status: string;
	genderPreference?: string | null;
};
export type Allocation = {
	id: string;
	roomId: string;
	attendeeId: string;
	status: "pending" | "checked_in" | "checked_out" | "cancelled";
	bedNumber?: string | null;
	plannedCheckinDate?: string | null;
	plannedCheckoutDate?: string | null;
	checkinAt?: string | null;
	checkoutAt?: string | null;
	keyIssued: boolean;
	keyReturned: boolean;
	notes?: string | null;
	attendeeName?: string | null;
	attendeeCode?: string | null;
	attendeeGender?: string | null;
	attendeePhone?: string | null;
	attendeeIsVip?: boolean | null;
};

const ROOM_STATUS_BG: Record<string, string> = {
	available: "bg-success-soft text-success-soft-fg border-success/20",
	allocated: "bg-info-soft text-info-soft-fg border-info/20",
	reserved: "bg-warn-soft text-warn-soft-fg border-warn/20",
	maintenance: "bg-neutral-soft text-neutral-soft-fg border-line-2",
	blocked: "bg-danger-soft text-danger-soft-fg border-danger/20",
};

function AccommodationPage() {
	const { conference, membership } = useConference();
	const canEdit = hasAtLeastRole(membership, "editor");
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();

	const blocks = useQuery<{ data: Block[] }>({
		queryKey: ["acc-blocks", conference.slug],
		queryFn: () =>
			api.get<{ data: Block[] }>(`/api/v1/c/${conference.slug}/accommodation/blocks`, {
				pageSize: 100,
			}),
	});

	const allRooms = useQuery<{ data: Room[] }>({
		queryKey: ["acc-all-rooms", conference.slug],
		queryFn: () =>
			api.get<{ data: Room[] }>(`/api/v1/c/${conference.slug}/accommodation/rooms`, {
				pageSize: 100,
			}),
	});

	const roomIdFromSearch = search.roomId;
	const roomToOpen = roomIdFromSearch
		? ((allRooms.data?.data ?? []).find(r => r.id === roomIdFromSearch) ?? null)
		: null;
	const selectedBlockId =
		(roomToOpen?.blockId || search.blockId || blocks.data?.data?.[0]?.id) ?? null;

	const rooms = useQuery<{ data: Room[] }>({
		queryKey: ["acc-rooms", conference.slug, selectedBlockId],
		queryFn: () =>
			api.get<{ data: Room[] }>(`/api/v1/c/${conference.slug}/accommodation/rooms`, {
				blockId: selectedBlockId ?? undefined,
				pageSize: 200,
			}),
		enabled: !!selectedBlockId,
	});

	const [openRoom, setOpenRoom] = useState<Room | null>(roomToOpen);
	const [createBlockOpen, setCreateBlockOpen] = useState(false);

	useEffect(() => {
		if (roomToOpen && openRoom && selectedBlockId) setSearch({ blockId: selectedBlockId });
	}, [roomToOpen, openRoom, selectedBlockId, setSearch]);

	return (
		<div className="p-6">
			<PageHeader
				title="Accommodation"
				description="Blocks, rooms, and allocations for attendees."
				actions={
					canEdit && (
						<Button
							variant="primary"
							leadingIcon={<Plus size={14} />}
							onClick={() => setCreateBlockOpen(true)}
						>
							New block
						</Button>
					)
				}
			/>
			<div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
				<div className="lg:col-span-1 space-y-2">
					{blocks.isLoading && <CenterSpinner />}
					{blocks.data?.data?.length === 0 && (
						<Card>
							<EmptyState
								icon={<Building2 size={24} />}
								title="No blocks yet"
								hint="Create one to start allocating rooms."
							/>
						</Card>
					)}
					{(blocks.data?.data ?? []).map(b => {
						const active = b.id === selectedBlockId;
						return (
							<button
								key={b.id}
								onClick={() => setSearch({ blockId: b.id })}
								className={cx(
									"w-full text-left bg-surface rounded-lg p-3.5 border transition-colors",
									active
										? "border-accent shadow-card"
										: "border-line hover:border-line-2",
								)}
							>
								<div className="flex items-start justify-between gap-2">
									<div className="min-w-0">
										<div className="text-sm font-semibold text-ink truncate">
											{b.name}
										</div>
										{b.address && (
											<div className="mt-0.5 text-[11px] text-ink-3 truncate">
												{b.address}
											</div>
										)}
									</div>
									{active && <Badge variant="accent">Active</Badge>}
								</div>
								<div className="mt-2 flex items-center gap-3 text-[11px] text-ink-3">
									<span>{b.roomCount ?? 0} rooms</span>
									<span>·</span>
									<span>
										{b.occupiedCount ?? 0}/{b.capacity ?? 0} beds
									</span>
								</div>
							</button>
						);
					})}
				</div>
				<div className="lg:col-span-3">
					<Card pad="md">
						<Legend />
						{rooms.isLoading && <CenterSpinner />}
						{!rooms.isLoading && rooms.data && rooms.data.data.length === 0 && (
							<EmptyState
								icon={<Building2 size={24} />}
								title="No rooms in this block"
								hint="Add rooms to start allocating."
							/>
						)}
						<div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
							{(rooms.data?.data ?? []).map(r => (
								<button
									key={r.id}
									onClick={() => setOpenRoom(r)}
									className={cx(
										"hover:cursor-pointer text-left rounded-md border p-2.5 transition-all hover:shadow-card hover:-translate-y-px",
										ROOM_STATUS_BG[r.status] ?? ROOM_STATUS_BG.available,
									)}
									title={`${r.roomNumber} · ${r.status}`}
								>
									<div className="font-semibold tabular-nums text-sm">
										{r.roomNumber}
									</div>
									<div className="mt-1 text-[11px] flex items-center gap-1">
										<Users size={10} />
										<span>
											{r.occupiedCount}/{r.capacity}
										</span>
									</div>
								</button>
							))}
						</div>
					</Card>
				</div>
			</div>

			{openRoom && (
				<RoomDrawer room={openRoom} onClose={() => setOpenRoom(null)} canEdit={canEdit} />
			)}

			{createBlockOpen && <BlockDrawer onClose={() => setCreateBlockOpen(false)} />}
		</div>
	);
}

function Legend() {
	return (
		<div className="mb-4 flex flex-wrap items-center gap-3 text-[11px] text-ink-2">
			{[
				["available", "Available"],
				["allocated", "Allocated"],
				["reserved", "Reserved"],
				["maintenance", "Maintenance"],
				["blocked", "Blocked"],
			].map(([status, label]) => (
				<span key={status} className="inline-flex items-center gap-1.5">
					{status ? (
						<span
							className={cx(
								"size-3 rounded-sm border",
								ROOM_STATUS_BG[status as keyof typeof ROOM_STATUS_BG] ?? "",
							)}
						/>
					) : null}
					{label}
				</span>
			))}
		</div>
	);
}

function RoomDrawer({
	room,
	onClose,
	canEdit,
}: {
	room: Room;
	onClose: () => void;
	canEdit: boolean;
}) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const confirm = useConfirm();

	const allocs = useQuery<{ data: Allocation[] }>({
		queryKey: ["acc-allocs", conference.slug, room.id],
		queryFn: () =>
			api.get<{ data: Allocation[] }>(
				`/api/v1/c/${conference.slug}/accommodation/allocations`,
				{ roomId: room.id, pageSize: 50 },
			),
	});

	const action = useMutation({
		mutationFn: (input: { allocId: string; action: "check_in" | "check_out" | "cancel" }) =>
			api.post(
				`/api/v1/c/${conference.slug}/accommodation/allocations/${input.allocId}/action`,
				allocationCheckActionSchema.parse({ action: input.action }),
			),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["acc-allocs", conference.slug, room.id] }).catch(
				console.error,
			);
			qc.invalidateQueries({ queryKey: ["acc-rooms", conference.slug] }).catch(console.error);
			qc.invalidateQueries({ queryKey: ["dashboard", conference.slug] }).catch(console.error);
			toast.success("Allocation updated");
		},
		onError: (e: any) => toast.error("Update failed", e.message),
	});

	const rows = allocs.data?.data ?? [];
	return (
		<EntityDrawer
			open={true}
			onOpenChange={v => !v && onClose()}
			title={`Room ${room.roomNumber}`}
			subtitle={`${room.occupiedCount}/${room.capacity} occupants · floor ${room.floor ?? "—"}`}
			status={<StatusBadge status={room.status} />}
			width="md"
		>
			<div className="space-y-3">
				{rows.length === 0 && (
					<EmptyState
						title="No allocations yet"
						hint="Allocate attendees from the attendee list."
					/>
				)}
				{rows.map(a => (
					<div
						key={a.id}
						className="rounded-md border border-line p-3 flex items-start justify-between gap-2"
					>
						<div className="min-w-0">
							<div className="text-sm font-medium text-ink truncate">
								{a.attendeeName}
							</div>
							<div className="mt-0.5 text-xs text-ink-3">
								<span className="font-mono text-ink-2">
									{a.attendeeCode}{" "}
									{a.attendeeIsVip && (
										<Badge variant="accent" size="xs">
											VIP
										</Badge>
									)}
								</span>
								{a.attendeeGender && <> · {a.attendeeGender}</>}
							</div>
							<div className="mt-1 text-[11px] text-ink-3">
								{a.checkinAt && <>Checked in {fmtRelative(a.checkinAt)} · </>}
								{a.checkoutAt && <>Checked out {fmtRelative(a.checkoutAt)} · </>}
								{a.bedNumber && <>Bed: {a.bedNumber}</>}
								{!a.checkinAt && !a.plannedCheckinDate && (
									<span className="italic">No check-in info</span>
								)}
							</div>
						</div>
						<div className="flex flex-col gap-1">
							<div className="flex items-center gap-1">
								<StatusBadge status={a.status} />
							</div>
							{canEdit && (
								<div className="flex flex-wrap gap-1 justify-end">
									{a.status === "pending" && (
										<Button
											variant="secondary"
											size="xs"
											onClick={() =>
												action.mutate({ allocId: a.id, action: "check_in" })
											}
										>
											Check in
										</Button>
									)}
									{a.status === "checked_in" && (
										<Button
											variant="secondary"
											size="xs"
											onClick={() =>
												action.mutate({
													allocId: a.id,
													action: "check_out",
												})
											}
										>
											Check out
										</Button>
									)}
									{a.status === "pending" && (
										<Button
											variant="danger"
											size="xs"
											onClick={async () => {
												const ok = await confirm({
													title: "Cancel allocation?",
													tone: "danger",
												});
												if (ok)
													action.mutate({
														allocId: a.id,
														action: "cancel",
													});
											}}
										>
											Cancel
										</Button>
									)}
									{a.status === "cancelled" && (
										<Badge variant="warn" size="xs">
											Cancelled
										</Badge>
									)}
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</EntityDrawer>
	);
}

function BlockDrawer({ onClose }: { onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const [form, setForm] = useState({ name: "", address: "", notes: "" });
	const create = useMutation({
		mutationFn: () => {
			const payload: AccommodationBlockInput = accommodationBlockCreateSchema.parse({
				code: slugify(form.name).slice(0, 32),
				name: form.name,
				address: form.address || undefined,
				notes: form.notes || undefined,
			});
			return api.post(`/api/v1/c/${conference.slug}/accommodation/blocks`, payload);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["acc-blocks", conference.slug] }).catch(
				console.error,
			);
			toast.success("Block created");
			onClose();
		},
		onError: (e: any) => toast.error("Create failed", e.message),
	});
	return (
		<EntityDrawer
			open={true}
			onOpenChange={v => !v && onClose()}
			title="New accommodation block"
			width="sm"
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
			<div className="space-y-4">
				<FieldRow label="Name" required>
					<Input
						value={form.name}
						onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
						placeholder="e.g. Guest House 1"
					/>
				</FieldRow>
				<FieldRow label="Address">
					<Input
						value={form.address}
						onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
					/>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}
