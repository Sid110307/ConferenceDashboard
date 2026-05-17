import { useState } from "react";
import { Link } from "react-router";

import {
	useDeleteTravelArrival,
	useTravelArrivals,
	useUpsertTravelArrival,
	type TravelArrivalWithRelations,
} from "@/db/hooks/travelArrivals";
import type { Database } from "@/db/types";
import { AlertCircle, Car, Clock, Plane } from "lucide-react";
import * as Recharts from "recharts";

import { Badge } from "@/components/Badge";
import { Card, CardHead } from "@/components/Card";
import { CustomTooltip } from "@/components/CustomTooltip";
import { EmptyState } from "@/components/EmptyState";
import EntityDrawer from "@/components/EntityDrawer";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";

import { useConference } from "@/core/ConferenceContext";
import { PAGES_META, statusVariant } from "@/core/data";
import { formatLabel } from "@/core/display";
import { Routes as AppRoutes } from "@/core/navigation";

type TravelArrivalUpdate = Database["public"]["Tables"]["travel_arrivals"]["Update"];

const getArrivalName = (arrival: TravelArrivalWithRelations) =>
	arrival.attendee_ref?.name || arrival.attendee || "Unknown";

export const TravelPage = () => {
	const { data: arrivals = [], isLoading } = useTravelArrivals();
	const { conferenceId } = useConference();
	const isEditor = useConference()?.isEditor || false;
	const upsert = useUpsertTravelArrival();
	const remove = useDeleteTravelArrival();
	const [editing, setEditing] = useState<TravelArrivalUpdate | null>(null);

	const now = new Date();
	const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);
	const urgentArrivals = arrivals.filter(arrival => {
		if (!arrival.arrival_time) return false;
		const arrivalTime = new Date(`2026-05-17T${arrival.arrival_time}`);
		return arrivalTime > now && arrivalTime <= twoHoursLater;
	});
	const vipArrivals = arrivals.filter(
		arrival => formatLabel(arrival.attendee_ref?.category || "") === "VIP",
	);
	const pendingArrivals = arrivals.filter(
		arrival => !arrival.arrival_time || !arrival.pickup_required || !arrival.pickup_status,
	);
	const modeCounts = arrivals.reduce<Record<string, number>>((acc, arrival) => {
		const mode = formatLabel(arrival.travel_mode || "Unknown");
		acc[mode] = (acc[mode] || 0) + 1;
		return acc;
	}, {});
	const travelModes = Object.entries(modeCounts).map(([name, count]) => ({ name, count }));

	return (
		<div className="flex flex-col gap-4">
			<SectionTitle
				title={PAGES_META.find(p => p.id === "travel")?.label || "Travel"}
				subtitle={
					isLoading
						? "Loading arrivals..."
						: PAGES_META.find(p => p.id === "travel")?.description ||
							"Arrivals, pickups, and transport coordination"
				}
			/>
			{urgentArrivals.length > 0 && (
				<Card className="mb-5 border-amber-200 bg-amber-50">
					<div className="flex items-center gap-3 p-4">
						<AlertCircle size={20} className="shrink-0 text-amber-600" />
						<div className="flex-1">
							<p className="font-semibold text-amber-900">
								🚨 {urgentArrivals.length} arrival
								{urgentArrivals.length > 1 ? "s" : ""} in next 2 hours
							</p>
							<p className="text-xs text-amber-700">
								{urgentArrivals.map(getArrivalName).join(", ")}
							</p>
						</div>
						<Badge variant="yellow">URGENT</Badge>
					</div>
				</Card>
			)}

			<div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					icon={Clock}
					label="Urgent Arrivals"
					value={urgentArrivals.length}
					sub="next 2 hours"
					color={urgentArrivals.length > 0 ? "yellow" : "gray"}
				/>
				<StatCard
					icon={Plane}
					label="VIP Arrivals"
					value={vipArrivals.length}
					color="gold"
				/>
				<StatCard
					icon={AlertCircle}
					label="Pending Details"
					value={pendingArrivals.length}
					sub="missing info"
					color="gray"
				/>
				{travelModes.slice(0, 1).map(mode => (
					<StatCard
						key={mode.name}
						icon={mode.name === "Car/Taxi" ? Car : Plane}
						label={mode.name}
						value={mode.count}
						color="blue"
					/>
				))}
			</div>

			{vipArrivals.length > 0 && (
				<Card className="mb-4">
					<CardHead
						title="VIP Arrivals"
						extra={<Badge variant="gold">{vipArrivals.length}</Badge>}
					/>
					<div className="divide-y divide-gray-100">
						{vipArrivals.map((arrival, index) => (
							<div
								key={index}
								className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
							>
								<div>
									<p className="font-medium text-zinc-900">
										{getArrivalName(arrival)}
									</p>
									<p className="text-xs text-zinc-500">
										{arrival.arrival_from || "-"}
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Badge variant={statusVariant(arrival.pickup_status || "")}>
										{formatLabel(arrival.pickup_status || "Pending")}
									</Badge>
									{arrival.pickup_required && (
										<Badge variant="green">Pickup Required</Badge>
									)}
								</div>
							</div>
						))}
					</div>
				</Card>
			)}

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHead title="All Arrivals" />
					{isEditor && (
						<button
							className="mx-4 mt-4 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
							onClick={() => setEditing({} as TravelArrivalUpdate)}
						>
							+ Add arrival
						</button>
					)}
					{arrivals.length === 0 ? (
						<div className="p-4">
							<EmptyState
								title="No arrivals scheduled"
								description="Add travel arrivals to track incoming participants"
								action={
									isEditor
										? {
												label: "Add First Arrival",
												onClick: () =>
													setEditing({} as TravelArrivalUpdate),
											}
										: undefined
								}
							/>
						</div>
					) : (
						<>
							<div className="hidden overflow-x-auto md:block">
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
												"Pickup Status",
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
										{arrivals.map((arrival, index) => (
											<tr key={index} className="hover:bg-gray-50">
												<td className="whitespace-nowrap px-4 py-3 text-zinc-900">
													<Link
														to={AppRoutes.travel(
															conferenceId,
															arrival.id,
														)}
														className="hover:text-blue-600 hover:underline"
													>
														{getArrivalName(arrival)}
													</Link>
												</td>
												<td className="px-4 py-3 text-xs text-zinc-600">
													{arrival.arrival_from || "-"}
												</td>
												<td className="px-4 py-3 text-xs text-zinc-600">
													{formatLabel(arrival.travel_mode || "")}
												</td>
												<td className="px-4 py-3 font-mono text-xs text-zinc-500">
													{arrival.arrival_time || "-"}
												</td>
												<td className="px-4 py-3">
													<Badge
														variant={
															arrival.pickup_required
																? "green"
																: "gray"
														}
													>
														{arrival.pickup_required ? "Yes" : "No"}
													</Badge>
												</td>
												<td className="px-4 py-3 text-xs text-zinc-600">
													{arrival.vehicle || "-"}
												</td>
												<td className="px-4 py-3">
													<Badge
														variant={statusVariant(
															arrival.pickup_status || "",
														)}
													>
														{formatLabel(
															arrival.pickup_status || "Pending",
														)}
													</Badge>
												</td>
												{isEditor && (
													<td className="px-4 py-3 text-xs">
														<button
															className="mr-2 rounded-md border border-gray-100 px-2 py-1 text-xs"
															onClick={() => setEditing(arrival)}
														>
															Edit
														</button>
														<button
															className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-600"
															onClick={() =>
																remove.mutate(arrival.id)
															}
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
							<div className="space-y-2 p-4 md:hidden">
								{arrivals.map((arrival, index) => (
									<button
										key={index}
										onClick={() => setEditing(arrival)}
										className="w-full rounded-md border border-gray-100 bg-gray-50 p-3 text-left transition-colors hover:bg-gray-100"
									>
										<div className="mb-2 flex items-start justify-between">
											<div>
												<p className="font-medium text-zinc-900">
													{getArrivalName(arrival)}
												</p>
												<p className="text-xs text-zinc-500">
													{arrival.arrival_from || "-"}
												</p>
											</div>
											<Badge
												variant={statusVariant(arrival.pickup_status || "")}
											>
												{formatLabel(arrival.pickup_status || "Pending")}
											</Badge>
										</div>
										<div className="flex gap-3 text-xs text-zinc-600">
											<span>🕐 {arrival.arrival_time || "-"}</span>
											<span>🚗 {formatLabel(arrival.travel_mode || "")}</span>
											{arrival.pickup_required && <span>✓ Pickup</span>}
										</div>
									</button>
								))}
							</div>
						</>
					)}
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
					open
					title={editing?.id ? "Edit arrival" : "Add arrival"}
					initial={editing}
					fields={[
						{ name: "attendee", label: "Attendee" },
						{ name: "arrival_from", label: "From" },
						{ name: "arrival_location", label: "Arrival Location" },
						{ name: "arrival_time", label: "Arrival Time" },
						{ name: "travel_mode", label: "Travel Mode" },
						{
							name: "pickup_required",
							label: "Pickup Required",
							type: "select",
							options: ["true", "false"],
						},
						{
							name: "pickup_status",
							label: "Pickup Status",
							type: "select",
							options: ["scheduled", "en_route", "delayed", "completed"],
						},
						{ name: "driver_name", label: "Driver Name" },
						{ name: "driver_phone", label: "Driver Phone" },
						{ name: "vehicle", label: "Vehicle" },
						{ name: "notes", label: "Notes", type: "textarea" },
					]}
					onCancel={() => setEditing(null)}
					onSave={async row => {
						await upsert.mutateAsync(row);
						setEditing(null);
					}}
					onDelete={
						editing?.id
							? async () => {
									if (editing.id && confirm("Delete this arrival?")) {
										await remove.mutateAsync(editing.id);
										setEditing(null);
									}
								}
							: undefined
					}
				/>
			)}
		</div>
	);
};

export default TravelPage;
