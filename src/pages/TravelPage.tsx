import { useState } from "react";
import { Link } from "react-router";

import {
	useDeleteTravelArrival,
	useTravelArrivals,
	useUpsertTravelArrival,
} from "@/db/hooks/travelArrivals";
import { Car, Plane } from "lucide-react";
import * as Recharts from "recharts";

import { Badge } from "@/components/Badge";
import { Card, CardHead } from "@/components/Card";
import { CustomTooltip } from "@/components/CustomTooltip";
import EntityDrawer from "@/components/EntityDrawer";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";

import { useConference } from "@/core/ConferenceContext";
import { PAGES_META, statusVariant } from "@/core/data";
import { Routes as AppRoutes } from "@/core/navigation";

export const TravelPage = () => {
	const { data: arrivals = [], isLoading } = useTravelArrivals();
	const _conf = useConference();
	const isEditor = _conf?.isEditor || false;
	const upsert = useUpsertTravelArrival();
	const remove = useDeleteTravelArrival();
	const [editing, setEditing] = useState<Record<string, any> | null>(null);

	const modeCounts = arrivals.reduce<Record<string, number>>((acc, a: any) => {
		const m = a.mode || a.travel_mode || "Unknown";
		acc[m] = (acc[m] || 0) + 1;
		return acc;
	}, {});

	const travelModes = Object.entries(modeCounts).map(([name, count]) => ({ name, count }));

	return (
		<div>
			<SectionTitle
				title={PAGES_META.find(p => p.id === "travel")?.label || "Travel"}
				subtitle={
					isLoading
						? "Loading arrivals..."
						: PAGES_META.find(p => p.id === "travel")?.description ||
							"Arrivals, pickups, and transport coordination"
				}
			/>
			<div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-4">
				{travelModes.map(mode => (
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
					{isEditor && (
						<button
							className="mx-4 mt-4 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
							onClick={() => setEditing({})}
						>
							+ Add arrival
						</button>
					)}
					<div className="overflow-x-auto">
						<table className="w-full text-sm">
							<thead>
								<tr className="border-b border-gray-100">
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
									{isEditor && (
										<th className="whitespace-nowrap px-4 py-3 text-left font-medium text-zinc-600">
											Actions
										</th>
									)}
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{arrivals.map((arrival: any, index: number) => (
									<tr key={index} className="hover:bg-gray-50">
										<td className="whitespace-nowrap px-4 py-3 text-zinc-900">
											<Link
												to={AppRoutes.travel(String(index))}
												className="hover:text-blue-600 hover:underline"
											>
												{arrival.name}
											</Link>
										</td>
										<td className="px-4 py-3 text-xs text-zinc-600">
											{arrival.from}
										</td>
										<td className="px-4 py-3 text-xs text-zinc-600">
											{arrival.mode || arrival.travel_mode}
										</td>
										<td className="px-4 py-3 font-mono text-xs text-zinc-500">
											{arrival.time}
										</td>
										<td className="px-4 py-3">
											<Badge
												variant={
													arrival.pickup || arrival.pickup === true
														? "green"
														: "gray"
												}
											>
												{arrival.pickup === true
													? "Yes"
													: arrival.pickup || "No"}
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
										{isEditor && (
											<td className="px-4 py-3 text-xs">
												<button
													className="mr-2 rounded-md px-2 py-1 text-xs border border-gray-100"
													onClick={() => setEditing(arrival)}
												>
													Edit
												</button>
												<button
													className="rounded-md px-2 py-1 text-xs border border-red-200 text-red-600"
													onClick={() => remove.mutate(arrival.id)}
												>
													Delete
												</button>
											</td>
										)}
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
									data={travelModes}
									dataKey="count"
									nameKey="name"
									cx="50%"
									cy="50%"
									outerRadius={72}
									paddingAngle={3}
								>
									{travelModes.map((_, index) => (
										<Recharts.Cell
											key={index}
											fill={
												["#60a5fa", "#a78bfa", "#34d399", "#fb923c"][
													index % 4
												]
											}
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
			{editing !== null && (
				<EntityDrawer
					open={editing !== null}
					title={editing?.id ? "Edit arrival" : "Add arrival"}
					initial={editing}
					fields={[
						{ name: "name", label: "Name" },
						{ name: "from", label: "From" },
						{ name: "travel_mode", label: "Mode" },
						{ name: "time", label: "Time" },
						{
							name: "pickup",
							label: "Pickup",
							type: "select",
							options: ["true", "false"],
						},
						{ name: "vehicle", label: "Vehicle" },
						{ name: "status", label: "Status" },
					]}
					onCancel={() => setEditing(null)}
					onSave={async row => {
						await upsert.mutateAsync(row);
						setEditing(null);
					}}
					onDelete={
						editing?.id
							? async () => {
									await remove.mutateAsync(editing.id);
									setEditing(null);
								}
							: undefined
					}
				/>
			)}
		</div>
	);
};
