import { Link } from "react-router";

import { AlertCircle, Bed, CheckCircle, Clock, Crown, Plane, Users, Utensils } from "lucide-react";
import * as Recharts from "recharts";

import { Badge } from "@/components/Badge";
import { Card, CardHead } from "@/components/Card";
import { CustomTooltip } from "@/components/CustomTooltip";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";

import { DATA, PAGES_META } from "@/core/data";
import { Routes as AppRoutes } from "@/core/navigation";

export const DashboardPage = () => (
	<div>
		<SectionTitle
			title={PAGES_META.find(p => p.id === "dashboard")?.label || "Dashboard"}
			subtitle={`${DATA.meta.name}  ·  ${DATA.meta.dates}  ·  Day ${DATA.meta.currentDay} of ${DATA.schedule.length}`}
		/>
		<div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
			<Link to={AppRoutes.attendees()}>
				<StatCard
					icon={Users}
					label="Total Registered"
					value={DATA.overview.total}
					color="blue"
				/>
			</Link>
			<Link to={AppRoutes.checkin()}>
					<StatCard
					icon={CheckCircle}
					label="Checked In"
						value={DATA.overview.checkedIn}
						sub={`${DATA.overview.total ? Math.round((DATA.overview.checkedIn / DATA.overview.total) * 100) : 0}% of total`}
					color="green"
				/>
			</Link>
			<Link to={AppRoutes.accommodation()}>
				<StatCard
					icon={Bed}
					label="Rooms Assigned"
					value={DATA.overview.roomsAssigned}
					sub={`of ${DATA.overview.roomsTotal}`}
					color="purple"
				/>
			</Link>
			<Link to={AppRoutes.vip()}>
				<StatCard icon={Crown} label="VIP Guests" value={DATA.overview.vip} color="gold" />
			</Link>
			<Link to={AppRoutes.food()}>
				<StatCard
					icon={Utensils}
					label="Meals Today"
					value={DATA.overview.mealCountToday}
					color="orange"
				/>
			</Link>
			<Link to={AppRoutes.travel()}>
				<StatCard
					icon={Plane}
					label="Pending Travel"
					value={DATA.overview.pendingTravel}
					sub="details missing"
					color="yellow"
				/>
			</Link>
			<Link to={AppRoutes.helpdesk()}>
				<StatCard
					icon={AlertCircle}
					label="Open Issues"
					value={DATA.overview.openIssues}
					color="red"
				/>
			</Link>
			<Link to={AppRoutes.schedule()}>
				<StatCard
					icon={Clock}
					label="Current Day"
					value={`Day ${DATA.meta.currentDay}`}
					sub="of 3 days"
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
							data={DATA.dailyCheckIn}
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
							<Recharts.Legend wrapperStyle={{ color: "#a1a1aa", fontSize: 11 }} />
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
					<Recharts.ResponsiveContainer width="100%" height="100%">
						<Recharts.PieChart>
							<Recharts.Pie
								data={DATA.categoryBreakdown}
								cx="50%"
								cy="50%"
								innerRadius={52}
								outerRadius={72}
								dataKey="value"
								paddingAngle={3}
							>
								{DATA.categoryBreakdown.map((entry, index) => (
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
				</div>
			</Card>
		</div>
		<Link to={AppRoutes.schedule(DATA.meta.currentDay.toString())}>
			<Card>
				<CardHead title={`Today's Schedule - Day ${DATA.meta.currentDay}`} />
				<div className="divide-y divide-gray-200">
					{DATA.schedule[DATA.meta.currentDay - 1].sessions.map((session, index) => (
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
	</div>
);
