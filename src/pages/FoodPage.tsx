import * as Recharts from "recharts";

import { Card, CardHead } from "@/components/Card";
import { CustomTooltip } from "@/components/CustomTooltip";
import { SectionTitle } from "@/components/SectionTitle";

import { DATA, PAGES_META } from "@/core/data";

export const FoodPage = () => (
	<div>
		<SectionTitle
			title={PAGES_META.find(p => p.id === "food")?.label || "Food & Catering"}
			subtitle={PAGES_META.find(p => p.id === "food")?.description || "Meal counts, dietary requirements, and catering status"}
		/>
		<div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
			<Card>
				<CardHead title="Day-wise Meal Counts" />
				<div className="h-52 p-4">
					<Recharts.ResponsiveContainer width="100%" height="100%">
						<Recharts.BarChart
							data={DATA.food.daywise}
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
								domain={[0, Math.max(...DATA.food.daywise.map(d => d.breakfast + d.lunch + d.tea + d.dinner), 100)]}
							/>
							<Recharts.Tooltip
								content={<CustomTooltip />}
								cursor={{ fill: "rgba(0,0,0,0.04)" }}
							/>
							<Recharts.Legend wrapperStyle={{ color: "#a1a1aa", fontSize: 11 }} />
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
				</div>
			</Card>
			<Card>
				<CardHead title="Dietary Requirements" />
				<div className="h-52 p-4">
					<Recharts.ResponsiveContainer width="100%" height="100%">
						<Recharts.PieChart>
							<Recharts.Pie
								data={DATA.food.diets}
								cx="50%"
								cy="50%"
								innerRadius={48}
								outerRadius={70}
								dataKey="value"
								paddingAngle={3}
							>
								{DATA.food.diets.map((diet, index) => (
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
				</div>
			</Card>
		</div>
		<Card>
			<CardHead title="Meal Summary" />
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-gray-200">
							{["Day", "Breakfast", "Lunch", "Tea / Snacks", "Dinner", "Total"].map(
								header => (
									<th
										key={header}
										className="px-5 py-3 text-left font-medium text-zinc-600"
									>
										{header}
									</th>
								),
							)}
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200">
						{DATA.food.daywise.map((day, index) => (
							<tr
								key={index}
								className={`hover:bg-gray-50 ${day.day.toLowerCase().includes("vip") ? "text-yellow-600" : ""}`}
							>
								<td className="px-5 py-3 font-medium text-zinc-900">{day.day}</td>
								<td className="px-5 py-3 text-zinc-600">{day.breakfast}</td>
								<td className="px-5 py-3 text-zinc-600">{day.lunch}</td>
								<td className="px-5 py-3 text-zinc-600">{day.tea}</td>
								<td className="px-5 py-3 text-zinc-600">{day.dinner}</td>
								<td className="px-5 py-3 font-semibold text-zinc-900">
									{day.breakfast + day.lunch + day.tea + day.dinner}
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	</div>
);
