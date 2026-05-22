import { useRef, useState } from "react";

import { api } from "@/lib/api";
import { useConference } from "@/lib/ConferenceContext";
import { fmtNumber, fmtTime, humanise } from "@/lib/format";
import { cx } from "@/lib/uiStyles";
import { useRealtime } from "@/lib/useRealtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, BedDouble, LifeBuoy, Plane, UserCheck, Utensils } from "lucide-react";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/c/$slug/control-room")({
	component: ControlRoomPage,
});

type DashboardCounters = {
	attendees: { total: number; checkedIn: number; vip: number };
	travel: {
		arrivals: { arrived: number; enRoute: number; scheduled: number };
	};
	accommodation: { occupied: number; capacity: number };
	helpdesk: { open: number; inProgress: number; urgent: number };
	mealsToday: { mealType: string; count: number }[];
};

type FeedEvent = {
	id: string;
	at: number;
	type: string;
	entity?: string;
	label: string;
	tone: "neutral" | "success" | "warn" | "danger" | "info";
};

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

	const counters = useQuery<DashboardCounters>({
		queryKey: ["dashboard", conference.slug],
		queryFn: () => api.get<DashboardCounters>(`/api/v1/c/${conference.slug}/dashboard`),
		refetchInterval: 30000,
	});

	const { connected } = useRealtime(conference.slug, ev => {
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
			ev.type === "meal_scan.created"
		) {
			qc.invalidateQueries({ queryKey: ["dashboard", conference.slug] });
		}
	});

	const c = counters.data;
	const meals = c?.mealsToday?.reduce((sum, m) => sum + m.count, 0) ?? 0;

	return (
		<div className="p-6">
			<PageHeader
				title="Control Room"
				description="Live operational board."
				actions={
					<Badge variant={connected ? "success" : "neutral"}>
						<span
							className={cx(
								"inline-block size-2 rounded-full mr-1.5",
								connected ? "bg-success animate-pulse" : "bg-ink-4",
							)}
						/>
						{connected ? "Live" : "Connecting..."}
					</Badge>
				}
			/>
			<div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
				<BigCounter
					icon={<UserCheck size={20} />}
					label="Checked in"
					value={c?.attendees.checkedIn ?? 0}
					sub={`of ${fmtNumber(c?.attendees.total ?? 0)}`}
					tone="success"
				/>
				<BigCounter
					icon={<Plane size={20} />}
					label="Arrived"
					value={c?.travel.arrivals.arrived ?? 0}
					sub={`${c?.travel.arrivals.enRoute ?? 0} en route`}
					tone="info"
				/>
				<BigCounter
					icon={<BedDouble size={20} />}
					label="Rooms occupied"
					value={c?.accommodation.occupied ?? 0}
					sub={`of ${fmtNumber(c?.accommodation.capacity ?? 0)}`}
					tone="accent"
				/>
				<BigCounter
					icon={<Utensils size={20} />}
					label="Meal scans today"
					value={meals}
					tone="neutral"
				/>
				<BigCounter
					icon={<LifeBuoy size={20} />}
					label="Open issues"
					value={(c?.helpdesk.open ?? 0) + (c?.helpdesk.inProgress ?? 0)}
					sub={c?.helpdesk.urgent ? `${c.helpdesk.urgent} urgent` : "none urgent"}
					tone={c?.helpdesk.urgent ? "danger" : "neutral"}
				/>
			</div>
			<Card
				title="Live event feed"
				subtitle="Realtime stream of every operational change"
				pad="none"
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
		</div>
	);
}

function BigCounter({
	icon,
	label,
	value,
	sub,
	tone,
}: {
	icon: React.ReactNode;
	label: string;
	value: number;
	sub?: string;
	tone: "neutral" | "accent" | "success" | "warn" | "danger" | "info";
}) {
	const toneCls = {
		neutral: "text-ink",
		accent: "text-accent-soft-fg",
		success: "text-success-soft-fg",
		warn: "text-warn-soft-fg",
		danger: "text-danger-soft-fg",
		info: "text-info-soft-fg",
	}[tone];
	return (
		<div className="bg-surface border border-line rounded-xl p-4">
			<div className="flex items-center gap-2 text-ink-3">
				{icon}
				<span className="text-[11px] font-semibold uppercase tracking-wider">{label}</span>
			</div>
			<div className={cx("mt-2 text-4xl font-bold tabular-nums", toneCls)}>
				{fmtNumber(value)}
			</div>
			{sub && <div className="mt-0.5 text-xs text-ink-3">{sub}</div>}
		</div>
	);
}
