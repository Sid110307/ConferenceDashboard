import { useRef, useState } from "react";

import { api } from "@/lib/api";
import { useConference } from "@/lib/ConferenceContext";
import { fmtNumber, fmtTime, humanise } from "@/lib/format";
import { cx } from "@/lib/uiStyles";
import { useRealtime } from "@/lib/useRealtime";
import { Dashboard } from "@/routes/c.$slug.index";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Activity, BedDouble, LifeBuoy, Plane, UserCheck, Utensils } from "lucide-react";

import { Card } from "@/components/Card";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";

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

	const counters = useQuery<{ data: Dashboard }>({
		queryKey: ["dashboard", conference.slug],
		queryFn: () => api.get<{ data: Dashboard }>(`/api/v1/c/${conference.slug}/dashboard`),
		refetchInterval: 30000,
	});

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
			ev.type === "meal_scan.created"
		) {
			qc.invalidateQueries({ queryKey: ["dashboard", conference.slug] }).catch(console.error);
		}
	});

	const c = counters.data?.data;
	const meals = c?.mealsToday?.reduce((sum, m) => sum + m.count, 0) ?? 0;

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
			<Card title="Live event feed" subtitle="Realtime stream of every operational change">
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
