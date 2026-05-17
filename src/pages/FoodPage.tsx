import { useState } from "react";

import {
	useDeleteFoodPlan,
	useFoodPlans,
	useUpsertFoodPlan,
	type FoodPlanWithRelations,
} from "@/db/hooks/foodPlans";
import type { Database } from "@/db/types";
import * as Recharts from "recharts";

import { Card, CardHead } from "@/components/Card";
import { CustomTooltip } from "@/components/CustomTooltip";
import EntityDrawer from "@/components/EntityDrawer";
import { SectionTitle } from "@/components/SectionTitle";

import { useConference } from "@/core/ConferenceContext";
import { PAGES_META } from "@/core/data";
import { formatLabel } from "@/core/display";

type DayWiseMealRow = {
	id?: string;
	day: string;
	breakfast: number;
	lunch: number;
	tea: number;
	dinner: number;
};

type DietRow = {
	name: string;
	value: number;
	color: string;
};

export const FoodPage = () => {
	const { data: plans = [], isLoading } = useFoodPlans();
	const isEditor = useConference()?.isEditor || false;
	const upsert = useUpsertFoodPlan();
	const remove = useDeleteFoodPlan();
	const [editing, setEditing] = useState<FoodPlanWithRelations | null>(null);

	let daywise: DayWiseMealRow[] = [];
	let diets: DietRow[] = [];

	if (plans && plans.length) {
		const mapped = plans.map(plan => ({
			day: formatLabel(String(plan.day_label || plan.meal_date || plan.id || "")),
			breakfast: plan.breakfast_count || 0,
			lunch: plan.lunch_count || 0,
			tea: plan.tea_count || 0,
			dinner: plan.dinner_count || 0,
		}));
		if (mapped.some(m => m.day)) daywise = mapped;

		const dietCounts = [
			{ name: "Veg", count: plans.reduce((s: number, p) => s + (p.veg_count || 0), 0) },
			{
				name: "Non-Veg",
				count: plans.reduce((s: number, p) => s + (p.nonveg_count || 0), 0),
			},
			{ name: "Vegan", count: plans.reduce((s: number, p) => s + (p.vegan_count || 0), 0) },
			{ name: "Jain", count: plans.reduce((s: number, p) => s + (p.jain_count || 0), 0) },
			{
				name: "Special",
				count: plans.reduce((s: number, p) => s + (p.special_count || 0), 0),
			},
		];
		const mappedDiets = dietCounts
			.filter(d => d.count > 0)
			.map(({ name, count }, i) => ({
				name,
				value: count,
				color: ["#34d399", "#f87171", "#fbbf24", "#a78bfa", "#60a5fa"][i % 5],
			}));
		if (mappedDiets.length) diets = mappedDiets;
	}

	return (
		<div className="flex gap-4 flex-col">
			<SectionTitle
				title={PAGES_META.find(p => p.id === "food")?.label || "Food & Catering"}
				subtitle={
					isLoading
						? "Loading food plans..."
						: PAGES_META.find(p => p.id === "food")?.description ||
							"Meal counts, dietary requirements, and catering status"
				}
			/>
			{isEditor && (
				<div className="mb-4 flex justify-end">
					<button
						className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
						onClick={() => setEditing({} as FoodPlanWithRelations)}
					>
						+ Add plan
					</button>
				</div>
			)}
			<div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Card>
					<CardHead title="Day-wise Meal Counts" />
					<div className="h-52 p-4">
						{isLoading ? (
							<div className="flex h-full items-center justify-center text-sm text-zinc-500">
								Loading...
							</div>
						) : (
							<Recharts.ResponsiveContainer width="100%" height="100%">
								<Recharts.BarChart
									data={daywise}
									margin={{ top: 4, right: 8, bottom: 0, left: -16 }}
								>
									<Recharts.XAxis
										dataKey="day"
										tick={{ fill: "#71717a", fontSize: 11 }}
										axisLine={false}
										tickLine={false}
									/>
									<Recharts.YAxis
										tick={{ fill: "#71717a", fontSize: 10 }}
										axisLine={false}
										tickLine={false}
										domain={[
											0,
											Math.max(
												...daywise.map(
													d =>
														(d.breakfast || 0) +
														(d.lunch || 0) +
														(d.tea || 0) +
														(d.dinner || 0),
												),
												100,
											),
										]}
									/>
									<Recharts.Tooltip
										content={<CustomTooltip />}
										cursor={{ fill: "rgba(0,0,0,0.04)" }}
									/>
									<Recharts.Legend
										wrapperStyle={{ color: "#a1a1aa", fontSize: 11 }}
									/>
									<Recharts.Bar
										dataKey="breakfast"
										name="Breakfast"
										fill="#60a5fa"
										radius={[3, 3, 0, 0]}
									/>
									<Recharts.Bar
										dataKey="lunch"
										name="Lunch"
										fill="#34d399"
										radius={[3, 3, 0, 0]}
									/>
									<Recharts.Bar
										dataKey="tea"
										name="Tea"
										fill="#fbbf24"
										radius={[3, 3, 0, 0]}
									/>
									<Recharts.Bar
										dataKey="dinner"
										name="Dinner"
										fill="#f472b6"
										radius={[3, 3, 0, 0]}
									/>
								</Recharts.BarChart>
							</Recharts.ResponsiveContainer>
						)}
					</div>
				</Card>
				<Card>
					<CardHead title="Dietary Requirements" />
					<div className="h-52 p-4">
						{isLoading ? (
							<div className="flex h-full items-center justify-center text-sm text-zinc-500">
								Loading...
							</div>
						) : (
							<Recharts.ResponsiveContainer width="100%" height="100%">
								<Recharts.PieChart>
									<Recharts.Pie
										data={diets}
										cx="50%"
										cy="50%"
										innerRadius={48}
										outerRadius={70}
										dataKey="value"
										paddingAngle={3}
									>
										{diets.map((diet, index) => (
											<Recharts.Cell key={index} fill={diet.color} />
										))}
									</Recharts.Pie>
									<Recharts.Tooltip content={<CustomTooltip />} />
									<Recharts.Legend
										wrapperStyle={{ color: "#a1a1aa", fontSize: 11 }}
										iconSize={8}
									/>
								</Recharts.PieChart>
							</Recharts.ResponsiveContainer>
						)}
					</div>
				</Card>
			</div>
			<Card>
				<CardHead title="Meal Summary" />
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-100">
								{[
									"Day",
									"Breakfast",
									"Lunch",
									"Tea / Snacks",
									"Dinner",
									"Total",
								].map(header => (
									<th
										key={header}
										className="px-5 py-3 text-left font-medium text-zinc-600"
									>
										{header}
									</th>
								))}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{daywise.map((day, index) => (
								<tr
									key={index}
									className={`hover:bg-gray-50 ${String(day.day).toLowerCase().includes("vip") ? "text-amber-700" : ""}`}
								>
									<td className="px-4 py-3 font-medium text-zinc-900">
										{day.day}
									</td>
									<td className="px-4 py-3 text-zinc-600">{day.breakfast}</td>
									<td className="px-4 py-3 text-zinc-600">{day.lunch}</td>
									<td className="px-4 py-3 text-zinc-600">{day.tea}</td>
									<td className="px-4 py-3 text-zinc-600">{day.dinner}</td>
									<td className="px-4 py-3 font-semibold text-zinc-900">
										{(day.breakfast || 0) +
											(day.lunch || 0) +
											(day.tea || 0) +
											(day.dinner || 0)}
									</td>
									{isEditor && (
										<td className="px-4 py-3 text-xs">
											<button
												className="mr-2 rounded-md px-2 py-1 text-xs border border-gray-100"
												onClick={() => setEditing(plans[index])}
											>
												Edit
											</button>
											{day.id && (
												<button
													className="rounded-md px-2 py-1 text-xs border border-red-200 text-red-600"
													onClick={async () => {
														if (confirm("Delete this plan?"))
															await remove.mutateAsync(day.id!);
													}}
												>
													Delete
												</button>
											)}
										</td>
									)}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>
			{editing !== null && (
				<EntityDrawer
					open={editing !== null}
					title={editing?.id ? "Edit plan" : "Add plan"}
					initial={editing}
					fields={[
						{ name: "day_label", label: "Day Label" },
						{ name: "meal_date", label: "Meal Date" },
						{ name: "breakfast_count", label: "Breakfast Count", type: "number" },
						{ name: "lunch_count", label: "Lunch Count", type: "number" },
						{ name: "tea_count", label: "Tea Count", type: "number" },
						{ name: "dinner_count", label: "Dinner Count", type: "number" },
						{ name: "veg_count", label: "Veg Count", type: "number" },
						{ name: "nonveg_count", label: "Non-Veg Count", type: "number" },
						{ name: "vegan_count", label: "Vegan Count", type: "number" },
						{ name: "jain_count", label: "Jain Count", type: "number" },
						{ name: "special_count", label: "Special Count", type: "number" },
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
									await remove.mutateAsync(editing.id!);
									setEditing(null);
								}
							: undefined
					}
				/>
			)}
		</div>
	);
};
