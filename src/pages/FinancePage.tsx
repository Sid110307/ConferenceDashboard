import { CheckCircle, Receipt, Star, TrendingUp } from "lucide-react";
import * as Recharts from "recharts";

import { Badge } from "@/components/Badge";
import { Card, CardHead } from "@/components/Card";
import { CustomTooltip } from "@/components/CustomTooltip";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";

import { DATA } from "@/core/data";

export const FinancePage = () => {
	const { budget, spent, income } = DATA.finance.summary;

	return (
		<div>
			<SectionTitle
				title="Finance & Budget Tracking"
				subtitle="Budget overview, expenditure, and income management"
			/>
			<div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard
					icon={Receipt}
					label="Total Budget"
					value={`INR ${(budget / 100000).toFixed(1)}L`}
					color="blue"
				/>
				<StatCard
					icon={TrendingUp}
					label="Total Spent"
					value={`INR ${(spent / 100000).toFixed(1)}L`}
					color="orange"
				/>
				<StatCard
					icon={Star}
					label="Income Received"
					value={`INR ${(income / 100000).toFixed(1)}L`}
					color="green"
				/>
				<StatCard
					icon={CheckCircle}
					label="Net Position"
					value={`INR ${((income - spent) / 100000).toFixed(1)}L`}
					color={income - spent >= 0 ? "green" : "red"}
				/>
			</div>
			<Card className="mb-4">
				<CardHead title="Budget vs Actual by Category" />
				<div className="h-64 p-4">
					<Recharts.ResponsiveContainer width="100%" height="100%">
						<Recharts.BarChart
							data={DATA.finance.breakdown}
							layout="vertical"
							margin={{ top: 0, right: 40, bottom: 0, left: 64 }}
						>
							<Recharts.XAxis
								type="number"
								tick={{ fill: "#71717a", fontSize: 10 }}
								axisLine={false}
								tickLine={false}
								tickFormatter={value => `INR ${value / 1000}k`}
							/>
							<Recharts.YAxis
								type="category"
								dataKey="name"
								tick={{ fill: "#a1a1aa", fontSize: 11 }}
								axisLine={false}
								tickLine={false}
								width={64}
							/>
							<Recharts.Tooltip
								content={<CustomTooltip />}
								cursor={{ fill: "rgba(0,0,0,0.04)" }}
							/>
							<Recharts.Legend wrapperStyle={{ color: "#a1a1aa", fontSize: 11 }} />
							<Recharts.Bar
								dataKey="budget"
								name="Budget"
								fill="#1e3a5c"
								radius={[0, 3, 3, 0]}
							/>
							<Recharts.Bar
								dataKey="actual"
								name="Actual"
								fill="#4a9ede"
								radius={[0, 3, 3, 0]}
							/>
						</Recharts.BarChart>
					</Recharts.ResponsiveContainer>
				</div>
			</Card>
			<Card>
				<CardHead title="Category Breakdown" />
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-200">
								{["Category", "Type", "Budget", "Actual", "Variance", "Status"].map(
									header => (
										<th
											key={header}
											scope="col"
											className="whitespace-nowrap px-5 py-3 text-left font-medium text-zinc-600"
										>
											{header}
										</th>
									),
								)}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{DATA.finance.breakdown.map((row, index) => {
								const variance = row.budget - row.actual;

								return (
									<tr key={index} className="hover:bg-gray-50">
										<td className="px-5 py-3 font-medium text-zinc-900">
											{row.name}
										</td>
										<td className="px-5 py-3">
											<Badge
												variant={row.type === "income" ? "green" : "blue"}
											>
												{row.type}
											</Badge>
										</td>
										<td className="px-5 py-3 text-zinc-600">
											INR {row.budget.toLocaleString()}
										</td>
										<td className="px-5 py-3 text-zinc-600">
											INR {row.actual.toLocaleString()}
										</td>
										<td className="px-5 py-3">
											<span
												className={
													variance >= 0
														? "text-green-400"
														: "text-red-400"
												}
											>
												INR {Math.abs(variance).toLocaleString()}{" "}
												{variance >= 0 ? "under" : "over"}
											</span>
										</td>
										<td className="px-5 py-3">
											<Badge variant={variance >= 0 ? "green" : "red"}>
												{variance >= 0 ? "On Track" : "Over Budget"}
											</Badge>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</Card>
		</div>
	);
};
