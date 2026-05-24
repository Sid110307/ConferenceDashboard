import CountUp from "react-countup";

import { api } from "@/lib/api";
import { useConference } from "@/lib/ConferenceContext";
import { fmtDateTime, fmtINR, fmtNumber } from "@/lib/format";
import { cx } from "@/lib/uiStyles";
import { useRealtime } from "@/lib/useRealtime";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
	Crown,
	ExternalLink,
	LifeBuoy,
	TrendingDown,
	TrendingUp,
	UserCheck,
	Users,
	Utensils,
} from "lucide-react";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CenterSpinner } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { StatCard } from "@/components/StatCard";

export const Route = createFileRoute("/c/$slug/")({
	component: DashboardPage,
});

export type Dashboard = {
	attendees: {
		total: number;
		registered: number;
		confirmed: number;
		checkedIn: number;
		vip: number;
		badgePrinted: number;
		kitCollected: number;
		male: number;
		female: number;
	};
	travel: {
		arrivalsPending: number;
		arrivalsCompleted: number;
		arrivalsDelayed: number;
		departuresPending: number;
		departuresCompleted: number;
	};
	accommodation: {
		rooms: number;
		capacity: number;
		occupied: number;
	};
	helpdesk: {
		open: number;
		inProgress: number;
		urgent: number;
		resolvedToday: number;
	};
	mealsToday: {
		mealType: string;
		count: number;
	}[];
	finance: {
		incomeActual: string;
		incomePlanned: string;
		expenseActual: string;
		expensePlanned: string;
	};
};

function DashboardPage() {
	const { conference } = useConference();
	const navigate = useNavigate();
	const qc = useQueryClient();

	const { data, isLoading, dataUpdatedAt } = useQuery<{ data: Dashboard }>({
		queryKey: ["dashboard", conference.slug],
		queryFn: () => api.get<{ data: Dashboard }>(`/api/v1/c/${conference.slug}/dashboard`),
		refetchInterval: 60000,
	});

	useRealtime(conference.slug, ev => {
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

	if (isLoading || !data?.data)
		return (
			<div className="p-6">
				<CenterSpinner label="Loading dashboard..." />
			</div>
		);

	const arrivals = {
		pending: data.data?.travel.arrivalsPending,
		completed: data.data?.travel.arrivalsCompleted,
		delayed: data.data?.travel.arrivalsDelayed,
	};
	const departures = {
		scheduled: data.data?.travel.departuresPending + data.data?.travel.departuresCompleted,
		completed: data.data?.travel.departuresCompleted,
	};
	const totalArrivals = arrivals.pending + arrivals.completed + arrivals.delayed;
	const arrivalsPct = totalArrivals === 0 ? 0 : (arrivals.completed / totalArrivals) * 100;

	const occupancyPct =
		data.data?.accommodation.capacity === 0
			? 0
			: (data.data?.accommodation.occupied / data.data?.accommodation.capacity) * 100;

	const incomeActual = Number(data.data?.finance.incomeActual);
	const incomePlanned = Number(data.data?.finance.incomePlanned) || 0;
	const expenseActual = Number(data.data?.finance.expenseActual);
	const expensePlanned = Number(data.data?.finance.expensePlanned) || 0;
	const net = incomeActual - expenseActual;
	const incomePct = incomePlanned === 0 ? 0 : (incomeActual / incomePlanned) * 100;
	const expensePct = expensePlanned === 0 ? 0 : (expenseActual / expensePlanned) * 100;

	const checkinPct =
		data.data?.attendees.total === 0
			? 0
			: (data.data?.attendees.checkedIn / data.data?.attendees.total) * 100;

	return (
		<div className="p-6 space-y-6">
			<PageHeader
				title={conference.name}
				description={`${conference.venueName} · ${fmtDateTime(conference.startDate)} - ${fmtDateTime(conference.endDate)}\n${conference.venueAddress}`}
			/>
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
				<StatCard
					label="Attendees"
					value={fmtNumber(data.data?.attendees.total)}
					icon={<Users size={18} />}
					tone="accent"
					hint={`${data.data?.attendees.confirmed} confirmed`}
					onClick={() => navigate({ to: "attendees" })}
				>
					<div className="flex items-center gap-2 mt-2">
						<MiniStat
							label="Male"
							value={data.data?.attendees.male}
							tone="info"
							className="flex flex-col items-center"
						/>
						<MiniStat
							label="Female"
							value={data.data?.attendees.female}
							tone="warn"
							className="flex flex-col items-center"
						/>
					</div>
				</StatCard>
				<StatCard
					label="Checked in"
					value={fmtNumber(data.data?.attendees.checkedIn)}
					icon={<UserCheck size={18} />}
					tone="success"
					hint={`${checkinPct.toFixed(1)}% of registered`}
					trend={checkinPct > 50 ? "up" : "flat"}
					onClick={() =>
						navigate({ to: "attendees", search: { checkinStatus: "checked_in" } })
					}
				/>
				<StatCard
					label="VIP guests"
					value={fmtNumber(data.data?.attendees.vip)}
					icon={<Crown size={18} />}
					tone="warn"
					onClick={() => navigate({ to: "vip" })}
				/>
				<StatCard
					label="Open issues"
					value={fmtNumber(data.data?.helpdesk.open + data.data?.helpdesk.inProgress)}
					icon={<LifeBuoy size={18} />}
					tone={data.data?.helpdesk.urgent > 0 ? "danger" : "neutral"}
					hint={
						data.data?.helpdesk.urgent > 0
							? `${data.data?.helpdesk.urgent} urgent`
							: undefined
					}
					onClick={() => navigate({ to: "helpdesk" })}
				/>
			</div>
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
				<Card
					title="Travel & arrivals"
					subtitle="Today's pickups by status"
					actions={
						<Button variant="icon" size="sm" onClick={() => navigate({ to: "travel" })}>
							<ExternalLink size={14} />
						</Button>
					}
				>
					<div className="space-y-3">
						<ProgressBar
							value={arrivalsPct}
							max={100}
							label={`${fmtNumber(arrivals.completed)} arrived`}
							hint={`${arrivalsPct.toFixed(0)}%`}
							tone="success"
						/>
						<div className="grid grid-cols-3 gap-2">
							<MiniStat label="Scheduled" value={arrivals.pending} tone="neutral" />
							<MiniStat label="En route" value={arrivals.delayed} tone="warn" />
							<MiniStat label="Arrived" value={arrivals.completed} tone="success" />
						</div>
						<div className="pt-2 mt-2 border-t border-line text-xs text-ink-3">
							Departures: <span className="text-ink-2">{departures.scheduled}</span>{" "}
							scheduled, <span className="text-ink-2">{departures.completed}</span>{" "}
							completed
						</div>
					</div>
				</Card>
				<Card
					title="Accommodation"
					subtitle={`${data.data?.accommodation.rooms} rooms · ${fmtNumber(data.data?.accommodation.capacity)} beds`}
					actions={
						<Button
							variant="icon"
							size="sm"
							onClick={() => navigate({ to: "accommodation" })}
						>
							<ExternalLink size={14} />
						</Button>
					}
				>
					<div className="space-y-3">
						<ProgressBar
							value={occupancyPct}
							max={100}
							label={`${fmtNumber(data.data?.accommodation.occupied)} occupied`}
							hint={`${occupancyPct.toFixed(0)}%`}
							tone={
								occupancyPct > 90
									? "danger"
									: occupancyPct > 70
										? "warn"
										: "success"
							}
						/>
						<div className="grid grid-cols-3 gap-2">
							<MiniStat
								label="Available"
								value={
									data.data?.accommodation.capacity -
									data.data?.accommodation.occupied
								}
								tone="success"
							/>
							<MiniStat
								label="Occupied"
								value={data.data?.accommodation.occupied}
								tone="accent"
							/>
							<MiniStat
								label="Rooms"
								value={data.data?.accommodation.rooms}
								tone="neutral"
							/>
						</div>
					</div>
				</Card>
				<Card title="Meals today" subtitle="Scan counts by meal type">
					{data.data?.mealsToday.length === 0 ? (
						<div className="text-sm text-ink-3 py-4 text-center">
							<Utensils size={22} className="mx-auto mb-2 text-ink-4" />
							No meal scans recorded yet
						</div>
					) : (
						<div className="space-y-2.5">
							{data.data?.mealsToday.map(m => (
								<div key={m.mealType} className="flex items-center gap-3">
									<Utensils size={14} className="text-ink-3 shrink-0" />
									<div className="text-sm text-ink capitalize flex-1">
										{m.mealType}
									</div>
									<Badge variant="info">{fmtNumber(m.count)} scans</Badge>
								</div>
							))}
						</div>
					)}
				</Card>
				<Card title="Finance" subtitle="Planned vs actual">
					<div className="space-y-3">
						<div className="flex items-baseline justify-between gap-2">
							<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
								Net
							</div>
							<CountUp
								className={`text-xl font-semibold tabular-nums ${
									net >= 0 ? "text-success-soft-fg" : "text-danger-soft-fg"
								}`}
								end={net}
								duration={1}
								separator=","
								prefix="₹"
								useIndianSeparators
							/>
						</div>
						<div className="space-y-2">
							<div className="flex items-center justify-between text-sm">
								<span className="text-ink-2 flex items-center gap-1.5">
									<TrendingUp size={13} className="text-success" /> Income
								</span>
								<span className="text-ink tabular-nums">
									<CountUp
										end={incomeActual}
										duration={1}
										separator=","
										prefix="₹"
										useIndianSeparators
									/>
									{incomePlanned > 0 && (
										<span className="text-ink-3 text-xs">
											/ {fmtINR(incomePlanned)} ({incomePct.toFixed(0)}%)
										</span>
									)}
								</span>
							</div>
							<div className="flex items-center justify-between text-sm">
								<span className="text-ink-2 flex items-center gap-1.5">
									<TrendingDown size={13} className="text-danger" /> Expense
								</span>
								<span className="text-ink tabular-nums">
									<CountUp
										end={expenseActual}
										duration={1}
										separator=","
										prefix="₹"
										useIndianSeparators
									/>
									{expensePlanned > 0 && (
										<span className="text-ink-3 text-xs">
											/ {fmtINR(expensePlanned)} ({expensePct.toFixed(0)}%)
										</span>
									)}
								</span>
							</div>
						</div>
					</div>
				</Card>
			</div>
			<div className="text-xs text-ink-3 text-center pt-2">
				Last updated: {fmtDateTime(dataUpdatedAt ? new Date(dataUpdatedAt) : null)}
			</div>
		</div>
	);
}

function MiniStat({
	value,
	label,
	className,
	tone = "neutral",
}: {
	label: string;
	value: number;
	className?: string;
	tone?: "neutral" | "accent" | "success" | "warn" | "danger" | "info";
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
		<div className={cx("bg-surface border border-line rounded-md px-3 py-2.5", className)}>
			<div className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
				{label}
			</div>
			<CountUp
				className={`mt-0.5 text-lg font-semibold tabular-nums ${toneCls}`}
				end={value}
				duration={1}
				separator=","
				useIndianSeparators
			/>
		</div>
	);
}
