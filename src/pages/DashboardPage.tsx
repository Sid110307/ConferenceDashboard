import { Link } from "react-router";



import { useAccommodationRooms } from "@/db/hooks/accommodationRooms";
import { useAttendees } from "@/db/hooks/attendees";
import { useConferenceDetails } from "@/db/hooks/conferences";
import { useFoodPlans } from "@/db/hooks/foodPlans";
import { useHelpdeskIssues } from "@/db/hooks/helpdeskIssues";
import { useSessions } from "@/db/hooks/sessions";
import { useTravelArrivals } from "@/db/hooks/travelArrivals";
import { useVipGuests } from "@/db/hooks/vipGuests";
import { AlertCircle, Bed, CheckCircle, Clock, Crown, Plane, Users, Utensils } from "lucide-react";
import * as Recharts from "recharts";



import { Badge } from "@/components/Badge";
import { Card, CardHead } from "@/components/Card";
import { CustomTooltip } from "@/components/CustomTooltip";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";



import { PAGES_META } from "@/core/data";
import { Routes as AppRoutes } from "@/core/navigation";





export const DashboardPage = () => {
	const { data: conference } = useConferenceDetails();
	const { data: attendees = [] } = useAttendees();
	const { data: rooms = [] } = useAccommodationRooms();
	const { data: vipGuests = [] } = useVipGuests();
	const { data: issues = [] } = useHelpdeskIssues();
	const { data: foodPlans = [] } = useFoodPlans();
	const { data: sessions = [] } = useSessions();
	const { data: travelArrivals = [] } = useTravelArrivals();

	const totalDaysInferred = Math.max(
		conference?.current_day || 1,
		...sessions.map((s: any) => Number(s.day_number || 1)),
		...foodPlans.map((p: any) => Number(p.day_number || 1)),
	);
	const meta = {
		name: conference?.name || "",
		dates: conference ? `${conference.start_date || ""} — ${conference.end_date || ""}` : "",
		currentDay: conference?.current_day || 1,
		totalDays: (conference as any)?.total_days || totalDaysInferred,
	} as any;

	const sessionsByDay = sessions.reduce(
		(acc, session) => {
			const day = (session as any).day_number || meta.currentDay;
			if (!acc[day]) acc[day] = [];
			acc[day].push({
				time: session.start_time || "",
				title: session.title || "",
				speaker: (session as any).speaker || "-",
				venue: (session as any).venue || "",
				status: (session as any).status || "upcoming",
			});
			return acc;
		},
		{} as Record<number, any[]>,
	);

	const currentDate =
		conference?.start_date && conference?.current_day
			? new Date(
					new Date(conference.start_date).getTime() +
						(conference.current_day - 1) * 24 * 60 * 60 * 1000,
				)
					.toISOString()
					.split("T")[0]
			: null;
	const mealCountToday = foodPlans
		.filter((p: any) =>
			p.day_number
				? Number(p.day_number) === Number(meta.currentDay)
				: currentDate && p.meal_date === currentDate,
		)
		.reduce(
			(s: number, p: any) =>
				s + ((p.breakfast || 0) + (p.lunch || 0) + (p.tea || 0) + (p.dinner || 0)),
			0,
		);

	const pendingTravel = travelArrivals.filter(
		(ta: any) => !ta.arrival_time || !ta.pickup_assigned || ta.status === "pending",
	).length;

	const overview = {
		total: attendees.length,
		checkedIn: attendees.filter(a => !!a.checked_in_at || a.checkin_status === "checked_in")
			.length,
		roomsAssigned: rooms.reduce((s: number, r: any) => s + (r.occupied_count || 0), 0),
		roomsTotal: rooms.reduce((s: number, r: any) => s + (r.capacity || 0), 0),
		vip: vipGuests.length,
		mealCountToday,
		pendingTravel,
		openIssues: issues.filter(i => i.issue_status === "open").length,
	} as any;

	const categoryCounts: Record<string, number> = {};
	attendees.forEach(a => {
		const c = (a.category || "Other").toString();
		categoryCounts[c] = (categoryCounts[c] || 0) + 1;
	});
	const colors = ["#60a5fa", "#a78bfa", "#34d399", "#fbbf24", "#f87171"];
	const categoryBreakdown = Object.entries(categoryCounts).map(([name, value], i) => ({
		name,
		value,
		color: colors[i % colors.length],
	}));

	const dailyCheckIn = [
		{
			day: `Day ${meta.currentDay}`,
			checkedIn: overview.checkedIn,
			registered: overview.total,
		},
	];

	return (
		<div className="flex gap-4 flex-col">
			<SectionTitle
				title={PAGES_META.find(p => p.id === "dashboard")?.label || "Dashboard"}
				subtitle={`${meta.name}  ·  ${meta.dates}  ·  Day ${meta.currentDay} of ${meta.totalDays}`}
			/>
			<div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-4">
				<Link to={AppRoutes.attendees()}>
					<StatCard
						icon={Users}
						label="Total Registered"
						value={overview.total}
						color="blue"
					/>
				</Link>
				<Link to={AppRoutes.checkin()}>
					<StatCard
						icon={CheckCircle}
						label="Checked In"
						value={overview.checkedIn}
						sub={`${overview.total ? Math.round((overview.checkedIn / overview.total) * 100) : 0}% of total`}
						color="green"
					/>
				</Link>
				<Link to={AppRoutes.accommodation()}>
					<StatCard
						icon={Bed}
						label="Rooms Assigned"
						value={overview.roomsAssigned}
						sub={`of ${overview.roomsTotal}`}
						color="purple"
					/>
				</Link>
				<Link to={AppRoutes.vip()}>
					<StatCard icon={Crown} label="VIP Guests" value={overview.vip} color="gold" />
				</Link>
				<Link to={AppRoutes.food()}>
					<StatCard
						icon={Utensils}
						label="Meals Today"
						value={overview.mealCountToday}
						color="orange"
					/>
				</Link>
				<Link to={AppRoutes.travel()}>
					<StatCard
						icon={Plane}
						label="Pending Travel"
						value={overview.pendingTravel}
						sub="details missing"
						color="yellow"
					/>
				</Link>
				<Link to={AppRoutes.helpdesk()}>
					<StatCard
						icon={AlertCircle}
						label="Open Issues"
						value={overview.openIssues}
						color="red"
					/>
				</Link>
				<Link to={AppRoutes.schedule()}>
					<StatCard
						icon={Clock}
						label="Current Day"
						value={`Day ${meta.currentDay}`}
						sub={`of ${meta.totalDays} days`}
						color="gray"
					/>
				</Link>
			</div>
			<div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHead title="Daily Check-in Progress" />
					<div className="h-52 p-4">
						<Recharts.ResponsiveContainer width="100%" height="100%">
							<Recharts.BarChart
								data={dailyCheckIn}
								margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
							>
								<Recharts.XAxis
									dataKey="day"
									tick={{ fill: "#71717a", fontSize: 12 }}
									axisLine={false}
									tickLine={false}
								/>
								<Recharts.YAxis
									tick={{ fill: "#71717a", fontSize: 11 }}
									axisLine={false}
									tickLine={false}
								/>
								<Recharts.Tooltip
									content={<CustomTooltip />}
									cursor={{ fill: "rgba(0,0,0,0.04)" }}
								/>
								<Recharts.Legend
									wrapperStyle={{ color: "#a1a1aa", fontSize: 11 }}
								/>
								<Recharts.Bar
									dataKey="checkedIn"
									name="Checked In"
									fill="#4a9ede"
									radius={[4, 4, 0, 0]}
								/>
								<Recharts.Bar
									dataKey="registered"
									name="Registered"
									fill="#1e3a5c"
									radius={[4, 4, 0, 0]}
								/>
							</Recharts.BarChart>
						</Recharts.ResponsiveContainer>
					</div>
				</Card>
				<Card>
					<CardHead title="Participant Mix" />
					<div className="h-52 p-4">
						{categoryBreakdown.length ? (
							<Recharts.ResponsiveContainer width="100%" height="100%">
								<Recharts.PieChart>
									<Recharts.Pie
										data={categoryBreakdown}
										cx="50%"
										cy="50%"
										innerRadius={52}
										outerRadius={72}
										dataKey="value"
										paddingAngle={3}
									>
										{categoryBreakdown.map((entry, index) => (
											<Recharts.Cell key={index} fill={entry.color} />
										))}
									</Recharts.Pie>
									<Recharts.Tooltip content={<CustomTooltip />} />
									<Recharts.Legend
										wrapperStyle={{ color: "#a1a1aa", fontSize: 11 }}
										iconSize={8}
									/>
								</Recharts.PieChart>
							</Recharts.ResponsiveContainer>
						) : (
							<div className="flex h-full items-center justify-center text-center">
								<p className="text-xs text-zinc-500">No participant data yet</p>
							</div>
						)}
					</div>
				</Card>
			</div>
			{sessionsByDay[meta.currentDay]?.length ? (
				<Link to={AppRoutes.schedule(meta.currentDay.toString())}>
					<Card>
						<CardHead title={`Today's Schedule - Day ${meta.currentDay}`} />
						<div className="divide-y divide-gray-100">
							{sessionsByDay[meta.currentDay].map((session: any, index: number) => (
								<div
									key={index}
									className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-gray-50"
								>
									<span className="w-28 shrink-0 font-mono text-xs text-zinc-600">
										{session.time}
									</span>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-zinc-900">
											{session.title}
										</p>
										<p className="text-xs text-zinc-600">
											{session.speaker !== "-" ? `${session.speaker} · ` : ""}
											{session.venue}
										</p>
									</div>
									<Badge
										variant={
											session.status === "ongoing"
												? "blue"
												: session.status === "done"
													? "green"
													: "gray"
										}
									>
										{session.status}
									</Badge>
								</div>
							))}
						</div>
					</Card>
				</Link>
			) : (
				<Card>
					<CardHead title={`Today's Schedule - Day ${meta.currentDay}`} />
					<div className="flex h-32 items-center justify-center">
						<p className="text-xs text-zinc-500">No sessions scheduled for today</p>
					</div>
				</Card>
			)}
		</div>
	);
};
