import { Link } from "react-router";

import { Car, Plane } from "lucide-react";
import * as Recharts from "recharts";

import { Badge } from "@/components/Badge";
import { Card, CardHead } from "@/components/Card";
import { CustomTooltip } from "@/components/CustomTooltip";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";

import { DATA, statusVariant, PAGES_META } from "@/core/data";
import { Routes as AppRoutes } from "@/core/navigation";

export const TravelPage = () => (
	<div>
		<SectionTitle
			title={PAGES_META.find(p => p.id === "travel")?.label || "Travel"}
			subtitle={PAGES_META.find(p => p.id === "travel")?.description || "Arrivals, pickups, and transport coordination"}
		/>
		<div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
			{DATA.travelModes.map(mode => (
				<StatCard
					key={mode.name}
					icon={mode.name === "Car/Taxi" ? Car : Plane}
					label={mode.name}
					value={mode.count}
					color="blue"
				/>
			))}
		</div>
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
			<Card className="lg:col-span-2">
				<CardHead title="Today's Arrivals" />
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-200">
								{[
									"Name",
									"From",
									"Mode",
									"Time",
									"Pickup",
									"Vehicle",
									"Status",
								].map(header => (
									<th
										key={header}
										className="whitespace-nowrap px-4 py-3 text-left font-medium text-zinc-600"
									>
										{header}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{DATA.travelArrivals.map((arrival, index) => (
								<tr key={index} className="hover:bg-gray-50">
									<td className="whitespace-nowrap px-4 py-3 text-zinc-900">
										<Link
											to={AppRoutes.travel(index.toString())}
											className="hover:text-blue-600 hover:underline"
										>
											{arrival.name}
										</Link>
									</td>
									<td className="px-4 py-3 text-xs text-zinc-600">
										{arrival.from}
									</td>
									<td className="px-4 py-3 text-xs text-zinc-600">
										{arrival.mode}
									</td>
									<td className="px-4 py-3 font-mono text-xs text-zinc-500">
										{arrival.time}
									</td>
									<td className="px-4 py-3">
										<Badge
											variant={arrival.pickup === "Yes" ? "green" : "gray"}
										>
											{arrival.pickup}
										</Badge>
									</td>
									<td className="px-4 py-3 text-xs text-zinc-600">
										{arrival.vehicle}
									</td>
									<td className="px-4 py-3">
										<Badge variant={statusVariant(arrival.status)}>
											{arrival.status}
										</Badge>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>
			<Card>
				<CardHead title="Mode Distribution" />
				<div className="h-56 p-4">
					<Recharts.ResponsiveContainer width="100%" height="100%">
						<Recharts.PieChart>
							<Recharts.Pie
								data={DATA.travelModes}
								dataKey="count"
								nameKey="name"
								cx="50%"
								cy="50%"
								outerRadius={72}
								paddingAngle={3}
							>
								{DATA.travelModes.map((_, index) => (
									<Recharts.Cell
										key={index}
										fill={["#60a5fa", "#a78bfa", "#34d399", "#fb923c"][index]}
									/>
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
	</div>
);
