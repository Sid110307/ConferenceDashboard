import { useMemo, useRef, useState } from "react";

import { api } from "@/lib/api";
import { useConference } from "@/lib/ConferenceContext";
import { fmtDateTime, fmtNumber, fmtTime, humanise } from "@/lib/format";
import { cx } from "@/lib/uiStyles";
import { useListQuery } from "@/lib/useListQuery";
import { useRealtime } from "@/lib/useRealtime";
import { Dashboard } from "@/routes/c.$slug.index";
import { type Staff } from "@conference/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, BedDouble, LifeBuoy, Plane, Plus, UserCheck, Utensils } from "lucide-react";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { useToast } from "@/components/Toast";

export const Route = createFileRoute("/c/$slug/control-room")({
	component: ControlRoomPage,
});

type FeedEvent = {
	id: string;
	at: number;
	type: string;
	entity?: string;
	label: string;
	tone: "neutral" | "success" | "warn" | "danger" | "info";
};

type DailyControlLog = {
	id: string;
	logDate: string;
	dayLabel?: string | null;
	shiftLabel?: string | null;
	summary: string;
	incidents?: string | null;
	actionsTaken?: string | null;
	pendingActions?: string | null;
	stats?: Record<string, number> | null;
	shiftHeadStaffId?: string | null;
};

const PAGE_SIZE = 25;

const EVENT_TONE: Record<string, FeedEvent["tone"]> = {
	"attendee.checked_in": "success",
	"attendee.checked_out": "neutral",
	"attendee.created": "info",
	"travel.arrived": "success",
	"travel.assigned": "info",
	"helpdesk.created": "warn",
	"helpdesk.resolved": "success",
	"allocation.checked_in": "success",
	"meal_scan.created": "info",
	"campaign.completed": "success",
	"import.completed": "success",
};

function describe(ev: { type: string; entity?: string; meta?: any }): string {
	const map: Record<string, string> = {
		"attendee.checked_in": "Attendee checked in",
		"attendee.checked_out": "Attendee checked out",
		"attendee.created": "New attendee added",
		"travel.arrived": "Travel segment marked arrived",
		"travel.assigned": "Vehicle assigned",
		"helpdesk.created": "New helpdesk issue raised",
		"helpdesk.resolved": "Helpdesk issue resolved",
		"allocation.checked_in": "Room check-in completed",
		"meal_scan.created": "Meal scan recorded",
		"campaign.progress": "Campaign batch sent",
		"campaign.completed": "Campaign completed",
		"import.completed": "Bulk import completed",
		"import.progress": "Import in progress",
	};
	return map[ev.type] ?? humanise(ev.type);
}

const MAX_FEED = 60;

function ControlRoomPage() {
	const { conference } = useConference();
	const qc = useQueryClient();
	const [feed, setFeed] = useState<FeedEvent[]>([]);
	const seq = useRef(0);
	const [logOpen, setLogOpen] = useState<DailyControlLog | null>(null);
	const [createLog, setCreateLog] = useState(false);
	const [logPage, setLogPage] = useState(1);

	const counters = useQuery<{ data: Dashboard }>({
		queryKey: ["dashboard", conference.slug],
		queryFn: () => api.get<{ data: Dashboard }>(`/api/v1/c/${conference.slug}/dashboard`),
		refetchInterval: 30000,
	});
	const logs = useListQuery<DailyControlLog>({
		key: ["control-room-logs", conference.slug],
		path: `/api/v1/c/${conference.slug}/control-room`,
		params: { page: logPage, pageSize: PAGE_SIZE },
	});
	const staff = useListQuery<Staff>({
		key: ["control-room-staff", conference.slug],
		path: `/api/v1/c/${conference.slug}/staff`,
		params: { pageSize: 200 },
	});
	const staffMap = useMemo(
		() => new Map((staff.data?.data ?? []).map(s => [s.id, s.name] as const)),
		[staff.data],
	);

	useRealtime(conference.slug, ev => {
		setFeed(prev => {
			const next: FeedEvent = {
				id: `${Date.now()}-${seq.current++}`,
				at: Date.now(),
				type: ev.type,
				entity: ev.entity,
				label: describe(ev),
				tone: EVENT_TONE[ev.type] ?? "neutral",
			};
			return [next, ...prev].slice(0, MAX_FEED);
		});

		if (
			ev.type.startsWith("attendee.") ||
			ev.type.startsWith("travel.") ||
			ev.type.startsWith("helpdesk.") ||
			ev.type.startsWith("allocation.") ||
			ev.type === "meal_scan.created" ||
			ev.type.startsWith("daily_control.")
		) {
			qc.invalidateQueries({ queryKey: ["dashboard", conference.slug] }).catch(console.error);
			qc.invalidateQueries({ queryKey: ["control-room-logs", conference.slug] })
				.catch(console.error)
				.catch(console.error);
		}
	});

	const c = counters.data?.data;
	const meals = c?.mealsToday?.reduce((sum, m) => sum + m.count, 0) ?? 0;
	const logRows = logs.data?.data ?? [];
	const logCols: Column<DailyControlLog>[] = [
		{
			key: "date",
			header: "Log date",
			cell: r => <span className="text-xs text-ink-2">{fmtDateTime(r.logDate)}</span>,
			width: "w-44",
		},
		{
			key: "labels",
			header: "Shift",
			cell: r => (
				<div className="text-xs">
					<div className="text-ink">{r.dayLabel ?? "—"}</div>
					<div className="text-ink-3">{r.shiftLabel ?? "—"}</div>
				</div>
			),
			width: "w-36",
		},
		{
			key: "summary",
			header: "Summary",
			cell: r => (
				<div className="min-w-0">
					<div className="text-ink font-medium truncate">{r.summary}</div>
					<div className="text-xs text-ink-3 truncate">{r.incidents ?? ""}</div>
				</div>
			),
		},
		{
			key: "actions",
			header: "Actions",
			cell: r => (
				<div className="min-w-0">
					{r.actionsTaken && (
						<div className="text-ink font-medium truncate">{r.actionsTaken}</div>
					)}
					{r.pendingActions && (
						<div className="text-xs text-ink-3 truncate">
							Pending: {r.pendingActions}
						</div>
					)}
				</div>
			),
		},
		{
			key: "head",
			header: "Shift head",
			cell: r => (
				<div className="text-xs text-ink-2">
					{r.shiftHeadStaffId
						? (staffMap.get(r.shiftHeadStaffId) ?? r.shiftHeadStaffId.slice(0, 8))
						: "—"}
				</div>
			),
			width: "w-44",
		},
		{
			key: "stats",
			header: "Statistics",
			cell: r => (
				<Badge variant="accent">
					{Object.keys(r.stats ?? {}).length} metric
					{Object.keys(r.stats ?? {}).length !== 1 && "s"}
				</Badge>
			),
			width: "w-28",
		},
	];

	return (
		<div className="p-6">
			<PageHeader title="Control Room" description="Live operational board." />
			<div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
				<StatCard
					icon={<UserCheck size={20} />}
					label="Checked in"
					value={c?.attendees.checkedIn ?? 0}
					hint={`of ${fmtNumber(c?.attendees.total ?? 0)}`}
					tone="success"
				/>
				<StatCard
					icon={<Plane size={20} />}
					label="Arrived"
					value={c?.travel.arrivalsCompleted ?? 0}
					hint={`${c?.travel.arrivalsPending ?? 0} en route`}
					tone="neutral"
				/>
				<StatCard
					icon={<BedDouble size={20} />}
					label="Rooms occupied"
					value={c?.accommodation.occupied ?? 0}
					hint={`of ${fmtNumber(c?.accommodation.capacity ?? 0)}`}
					tone="accent"
				/>
				<StatCard
					icon={<Utensils size={20} />}
					label="Meal scans today"
					value={meals}
					tone="neutral"
				/>
				<StatCard
					icon={<LifeBuoy size={20} />}
					label="Open issues"
					value={(c?.helpdesk.open ?? 0) + (c?.helpdesk.inProgress ?? 0)}
					hint={c?.helpdesk.urgent ? `${c.helpdesk.urgent} urgent` : "none urgent"}
					tone={c?.helpdesk.urgent ? "danger" : "neutral"}
				/>
			</div>
			<Card
				title="Live event feed"
				subtitle="Realtime stream of every operational change"
				className="mb-5"
			>
				<div className="max-h-[55vh] overflow-y-auto divide-y divide-line">
					{feed.length === 0 && (
						<div className="px-4 py-10 text-center text-sm text-ink-3">
							<Activity size={22} className="mx-auto mb-2 text-ink-4" />
							Waiting for live events...
						</div>
					)}
					{feed.map(ev => (
						<div key={ev.id} className="flex items-center gap-3 px-4 py-2.5">
							<span
								className={cx(
									"size-2 rounded-full shrink-0",
									{
										neutral: "bg-ink-4",
										success: "bg-success",
										warn: "bg-warn",
										danger: "bg-danger",
										info: "bg-info",
									}[ev.tone],
								)}
							/>
							<span className="text-sm text-ink flex-1">{ev.label}</span>
							<span className="text-[11px] tabular-nums text-ink-3">
								{fmtTime(new Date(ev.at))}
							</span>
						</div>
					))}
				</div>
			</Card>
			<Card
				title="Daily control logs"
				subtitle="Day/shift summaries, incidents, and actions for the control room"
				actions={
					<Button
						variant="primary"
						size="sm"
						leadingIcon={<Plus size={13} />}
						onClick={() => setCreateLog(true)}
					>
						New log
					</Button>
				}
			>
				<DataTable
					columns={logCols}
					rows={logRows}
					loading={logs.isLoading || staff.isLoading}
					onRowClick={r => setLogOpen(r)}
					selectedKey={logOpen?.id ?? null}
					emptyTitle="No control logs yet"
					emptyHint="Record the day’s operational summary here."
				/>
				<Pagination
					page={logPage}
					pageSize={PAGE_SIZE}
					total={logs.data?.pagination?.total ?? 0}
					onChange={setLogPage}
				/>
			</Card>
			{(logOpen || createLog) && (
				<ControlLogDrawer
					log={logOpen}
					staff={staff.data?.data ?? []}
					onClose={() => {
						setLogOpen(null);
						setCreateLog(false);
					}}
				/>
			)}
		</div>
	);
}

function ControlLogDrawer({
	log,
	staff,
	onClose,
}: {
	log: DailyControlLog | null;
	staff: Staff[];
	onClose: () => void;
}) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const isEdit = !!log;
	const [form, setForm] = useState<Partial<DailyControlLog> & { statsText: string }>(
		log
			? { ...log, statsText: JSON.stringify(log.stats ?? {}, null, 2) }
			: { logDate: new Date().toISOString(), statsText: "{}" },
	);

	const save = useMutation({
		mutationFn: () => {
			const body = {
				logDate: form.logDate,
				dayLabel: form.dayLabel || undefined,
				shiftLabel: form.shiftLabel || undefined,
				summary: form.summary,
				incidents: form.incidents || undefined,
				actionsTaken: form.actionsTaken || undefined,
				pendingActions: form.pendingActions || undefined,
				stats: JSON.parse(form.statsText || "{}"),
				shiftHeadStaffId: form.shiftHeadStaffId || undefined,
			};
			const path = `/api/v1/c/${conference.slug}/control-room`;
			return isEdit ? api.patch(`${path}/${log!.id}`, body) : api.post(path, body);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["control-room-logs", conference.slug] })
				.catch(console.error)
				.catch(console.error);
			toast.success(isEdit ? "Log updated" : "Log created");
			onClose();
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});

	const upd = (p: Partial<DailyControlLog> & { statsText?: string }) =>
		setForm(f => ({ ...f, ...p }));

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={isEdit ? "Edit control log" : "New control log"}
			width="lg"
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
						Save
					</Button>
				</>
			}
		>
			<div className="grid grid-cols-2 gap-3">
				<FieldRow label="Log date" required>
					<Input
						type="datetime-local"
						value={(form.logDate ?? new Date().toISOString()).slice(0, 16)}
						onChange={e =>
							upd({
								logDate: e.target.value
									? new Date(e.target.value).toISOString()
									: undefined,
							})
						}
					/>
				</FieldRow>
				<FieldRow label="Day label">
					<Input
						value={form.dayLabel ?? ""}
						onChange={e => upd({ dayLabel: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Shift label">
					<Input
						value={form.shiftLabel ?? ""}
						onChange={e => upd({ shiftLabel: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Shift head">
					<Select
						value={form.shiftHeadStaffId ?? ""}
						onChange={e => upd({ shiftHeadStaffId: e.target.value || undefined })}
					>
						<option value="">—</option>
						{staff.map(s => (
							<option key={s.id} value={s.id}>
								{s.name}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Summary" className="col-span-2">
					<Textarea
						value={form.summary ?? ""}
						onChange={e => upd({ summary: e.target.value })}
						className="min-h-28"
					/>
				</FieldRow>
				<FieldRow label="Incidents" className="col-span-2">
					<Textarea
						value={form.incidents ?? ""}
						onChange={e => upd({ incidents: e.target.value })}
						className="min-h-24"
					/>
				</FieldRow>
				<FieldRow label="Actions taken" className="col-span-2">
					<Textarea
						value={form.actionsTaken ?? ""}
						onChange={e => upd({ actionsTaken: e.target.value })}
						className="min-h-24"
					/>
				</FieldRow>
				<FieldRow label="Pending actions" className="col-span-2">
					<Textarea
						value={form.pendingActions ?? ""}
						onChange={e => upd({ pendingActions: e.target.value })}
						className="min-h-24"
					/>
				</FieldRow>
				<FieldRow
					label="Stats JSON"
					className="col-span-2"
					hint={
						<span className="text-xs text-ink-3">
							Use a JSON object like {`{"attendees": 120, "vehicles": 3}`}
						</span>
					}
				>
					<Textarea
						value={form.statsText}
						onChange={e => upd({ statsText: e.target.value })}
						className="min-h-28 font-mono text-[13px]"
					/>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}
