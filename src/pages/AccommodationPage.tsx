import { useAccommodationIssues } from "@/db/hooks/accommodationIssues";
import { useAccommodationRooms } from "@/db/hooks/accommodationRooms";
import * as Recharts from "recharts";

import { Badge } from "@/components/Badge";
import { Card, CardHead } from "@/components/Card";
import { CountUpNumber } from "@/components/CountUpNumber";
import { CustomTooltip } from "@/components/CustomTooltip";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionTitle } from "@/components/SectionTitle";

import { statusVariant } from "@/core/data";

export const AccommodationPage = () => {
	const { data: rooms = [] } = useAccommodationRooms();
	const { data: issues = [] } = useAccommodationIssues();

	const summaryMap: Record<string, { type: string; total: number; occupied: number }> = {};
	rooms.forEach((r: any) => {
		const key = r.room_type || r.room_code || "General";
		if (!summaryMap[key]) summaryMap[key] = { type: key, total: 0, occupied: 0 };
		summaryMap[key].total += r.capacity || 0;
		summaryMap[key].occupied += r.occupied_count || 0;
	});
	const summary = Object.values(summaryMap);

	return (
		<div className="flex gap-4 flex-col">
			<SectionTitle
				title="Accommodation Management"
				subtitle="Room allocations, occupancy, and issue tracking"
			/>
			<div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-3">
				{summary.map(room => {
					const free = room.total - room.occupied;
					return (
						<Card key={room.type} className="p-4">
							<div className="mb-3 flex items-start justify-between">
								<div>
									<p className="text-xs text-zinc-600">{room.type}</p>
									<p className="text-xl font-semibold text-zinc-900">
										<CountUpNumber value={room.occupied} />
										<span className="text-sm font-normal text-zinc-600">
											{" "}
											/<CountUpNumber value={room.total} />
										</span>
									</p>
								</div>
								<Badge
									variant={free === 0 ? "red" : free <= 3 ? "yellow" : "green"}
								>
									<CountUpNumber value={free} /> free
								</Badge>
							</div>
							<ProgressBar
								value={room.occupied}
								max={room.total}
								color={free <= 3 ? "red" : "blue"}
							/>
						</Card>
					);
				})}
			</div>
			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Card>
					<CardHead title="Occupancy by Room Type" />
					<div className="h-52 p-4">
						<Recharts.ResponsiveContainer width="100%" height="100%">
							<Recharts.BarChart
								data={summary}
								margin={{ top: 0, right: 8, bottom: 0, left: -16 }}
							>
								<Recharts.XAxis
									dataKey="type"
									tick={{ fill: "#71717a", fontSize: 10 }}
									axisLine={false}
									tickLine={false}
								/>
								<Recharts.YAxis
									tick={{ fill: "#71717a", fontSize: 10 }}
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
									dataKey="total"
									name="Total"
									fill="#1e3a5c"
									radius={[3, 3, 0, 0]}
								/>
								<Recharts.Bar
									dataKey="occupied"
									name="Occupied"
									fill="#4a9ede"
									radius={[3, 3, 0, 0]}
								/>
							</Recharts.BarChart>
						</Recharts.ResponsiveContainer>
					</div>
				</Card>
				<Card>
					<CardHead title="Room Issues" />
					<div className="divide-y divide-gray-100">
						{issues.map((issue: any, index: number) => (
							<div key={index} className="flex items-start justify-between px-4 py-4">
								<div>
									<p className="text-sm font-medium text-zinc-900">
										{issue.room}
									</p>
									<p className="mt-0.5 text-xs text-zinc-600">
										{issue.description || issue.issue}
									</p>
								</div>
								<div className="ml-3 flex gap-2">
									<Badge
										variant={
											issue.priority === "High"
												? "red"
												: issue.priority === "Medium"
													? "yellow"
													: "gray"
										}
									>
										{issue.priority}
									</Badge>
									<Badge variant={statusVariant(issue.status)}>
										{issue.status}
									</Badge>
								</div>
							</div>
						))}
					</div>
				</Card>
			</div>
		</div>
	);
};
