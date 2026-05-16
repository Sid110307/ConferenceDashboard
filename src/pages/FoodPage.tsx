import { useState } from "react";

import { useDeleteFoodPlan, useFoodPlans, useUpsertFoodPlan } from "@/db/hooks/foodPlans";
import * as Recharts from "recharts";

import { Card, CardHead } from "@/components/Card";
import { CustomTooltip } from "@/components/CustomTooltip";
import EntityDrawer from "@/components/EntityDrawer";
import { SectionTitle } from "@/components/SectionTitle";

import { useConference } from "@/core/ConferenceContext";
import { PAGES_META } from "@/core/data";

export const FoodPage = () => {
	const { data: plans = [], isLoading } = useFoodPlans();
	const _conf = useConference();
	const isEditor = _conf?.isEditor || false;
	const upsert = useUpsertFoodPlan();
	const remove = useDeleteFoodPlan();
	const [editing, setEditing] = useState<Record<string, any> | null>(null);

	let daywise: any[] = [];
	let diets: any[] = [];

	if (plans && plans.length) {
		const mapped = plans.map((p: any) => ({
			...p,
			day: p.day || p.label || String(p.id || ""),
			breakfast: p.breakfast || 0,
			lunch: p.lunch || 0,
			tea: p.tea || 0,
			dinner: p.dinner || 0,
		}));
		if (mapped.some(m => m.day)) daywise = mapped;

		const dietMap: Record<string, number> = {};
		plans.forEach((p: any) => {
			const d = p.diet_preference || p.diet || null;
			if (d) dietMap[d] = (dietMap[d] || 0) + 1;
		});
		const mappedDiets = Object.entries(dietMap).map(([name, value], i) => ({
			name,
			value,
			color: ["#34d399", "#f87171", "#fbbf24", "#a78bfa", "#60a5fa"][i % 5],
		}));
		if (mappedDiets.length) diets = mappedDiets;
	}

	return (
		<div>
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
						onClick={() => setEditing({})}
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
							{daywise.map((day: any, index) => (
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
												onClick={() => setEditing(day)}
											>
												Edit
											</button>
											{day.id && (
												<button
													className="rounded-md px-2 py-1 text-xs border border-red-200 text-red-600"
													onClick={() => remove.mutate(day.id)}
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
						{ name: "day", label: "Day" },
						{ name: "breakfast", label: "Breakfast", type: "number" },
						{ name: "lunch", label: "Lunch", type: "number" },
						{ name: "tea", label: "Tea", type: "number" },
						{ name: "dinner", label: "Dinner", type: "number" },
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
