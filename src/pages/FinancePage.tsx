import { useState } from "react";

import {
	useDeleteFinanceItem,
	useFinanceItems,
	useUpsertFinanceItem,
	type FinanceItemMapped,
} from "@/db/hooks/financeItems";
import { AlertCircle, CheckCircle, Receipt, Star, TrendingUp } from "lucide-react";
import * as Recharts from "recharts";

import { Badge } from "@/components/Badge";
import { Card, CardHead } from "@/components/Card";
import { CustomTooltip } from "@/components/CustomTooltip";
import { EmptyState } from "@/components/EmptyState";
import EntityDrawer from "@/components/EntityDrawer";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";
import {
	primaryButtonClassName,
	tableActionButtonClassName,
	tableDangerButtonClassName,
} from "@/components/uiStyles";

import { useConference } from "@/core/ConferenceContext.tsx";
import { formatLabel } from "@/core/display";

type FinanceBreakdownRow = {
	id: string;
	name: string;
	type: "income" | "expense";
	budget: number;
	actual: number;
	sponsorship_pledged: number;
	sponsorship_received: number;
};

type FinanceBreakdownRowWithVariance = FinanceBreakdownRow & {
	variance: number;
	variancePercent: number;
	isOverBudget: boolean;
};

type FinanceEditorRow = Partial<FinanceBreakdownRow> & { id?: string };

export const FinancePage = () => {
	const { isEditor } = useConference();
	const { data: financeRows = [] } = useFinanceItems();
	const upsert = useUpsertFinanceItem();
	const remove = useDeleteFinanceItem();
	const [editing, setEditing] = useState<FinanceEditorRow | null>(null);
	const breakdownRows: FinanceBreakdownRow[] = financeRows.map((row: FinanceItemMapped) => ({
		id: row.id,
		name: row.item_name || "Untitled",
		type:
			row.category === "registration" || row.category === "sponsorship"
				? "income"
				: "expense",
		budget: row.budget_amount || 0,
		actual: row.actual_amount || 0,
		sponsorship_pledged: row.category === "sponsorship" ? row.budget_amount || 0 : 0,
		sponsorship_received: row.category === "sponsorship" ? row.actual_amount || 0 : 0,
	}));

	const budget = breakdownRows.reduce((s, r) => s + (r.budget || 0), 0);
	const spent = breakdownRows.reduce((s, r) => s + (r.actual || 0), 0);
	const sponsored = breakdownRows.reduce((s, r) => s + (r.sponsorship_pledged || 0), 0);
	const sponsorshipReceived = breakdownRows.reduce(
		(s, r) => s + (r.sponsorship_received || 0),
		0,
	);
	const income = breakdownRows
		.filter(r => r.type === "income")
		.reduce((s, r) => s + (r.actual || 0), 0);

	const categoriesWithVariance: FinanceBreakdownRowWithVariance[] = breakdownRows.map(r => ({
		...r,
		variance: r.budget - r.actual,
		variancePercent: r.budget > 0 ? Math.round(((r.budget - r.actual) / r.budget) * 100) : 0,
		isOverBudget: r.actual > r.budget,
	}));

	const topVariances = [...categoriesWithVariance]
		.sort((a, b) => Math.abs(b.variance) - Math.abs(a.variance))
		.slice(0, 5);

	return (
		<div className="flex gap-4 flex-col">
			<SectionTitle
				title="Finance & Budget Tracking"
				subtitle="Budget overview, expenditure, sponsorship, and income management"
			/>
			<div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-5">
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
					label="Sponsorship Pledged"
					value={`INR ${(sponsored / 100000).toFixed(1)}L`}
					color="purple"
				/>
				<StatCard
					icon={CheckCircle}
					label="Sponsorship Received"
					value={`INR ${(sponsorshipReceived / 100000).toFixed(1)}L`}
					sub={`of INR ${(sponsored / 100000).toFixed(1)}L`}
					color={sponsorshipReceived >= sponsored * 0.8 ? "green" : "yellow"}
				/>
				<StatCard
					icon={AlertCircle}
					label="Net Position"
					value={`INR ${((income + sponsorshipReceived - spent) / 100000).toFixed(1)}L`}
					color={income + sponsorshipReceived - spent >= 0 ? "green" : "red"}
				/>
			</div>
			{topVariances.some(v => v.isOverBudget) && (
				<Card className="mb-4 border-red-200 bg-red-50">
					<div className="flex items-start gap-3 p-4">
						<AlertCircle size={20} className="shrink-0 text-red-600 mt-0.5" />
						<div>
							<p className="font-semibold text-red-900">Categories Over Budget</p>
							<div className="mt-2 text-sm text-red-700">
								{topVariances
									.filter(v => v.isOverBudget)
									.map(v => (
										<p key={v.id}>
											{v.name}:{" "}
											<span className="font-medium">
												+INR {Math.abs(v.variance).toLocaleString()}
											</span>
										</p>
									))}
							</div>
						</div>
					</div>
				</Card>
			)}

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Card>
					<CardHead title="Budget vs Actual by Category" />
					<div className="h-64 p-4">
						{breakdownRows.length > 0 ? (
							<Recharts.ResponsiveContainer width="100%" height="100%">
								<Recharts.BarChart
									data={breakdownRows}
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
									<Recharts.Legend
										wrapperStyle={{ color: "#a1a1aa", fontSize: 11 }}
									/>
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
						) : (
							<EmptyState
								title="No budget data"
								description="Add finance items to view charts"
							/>
						)}
					</div>
				</Card>

				<Card>
					<CardHead title="Budget Variance" />
					<div className="space-y-2 p-4">
						{topVariances.length > 0 ? (
							topVariances.map((cat: FinanceBreakdownRowWithVariance) => (
								<div key={cat.id} className="rounded-md bg-gray-50 p-3">
									<div className="flex items-center justify-between mb-2">
										<p className="font-medium text-xs text-zinc-900">
											{cat.name}
										</p>
										<Badge
											variant={
												cat.isOverBudget
													? "red"
													: cat.variance > 0
														? "green"
														: "gray"
											}
										>
											{cat.isOverBudget ? "+INR " : ""}
											{Math.abs(cat.variance).toLocaleString()} (
											{cat.variancePercent}%)
										</Badge>
									</div>
									<div className="h-2 w-full rounded-full bg-gray-200">
										<div
											className={`h-2 rounded-full ${
												cat.isOverBudget ? "bg-red-500" : "bg-green-500"
											}`}
											style={{
												width: `${Math.min(100, Math.abs(cat.variancePercent))}%`,
											}}
										/>
									</div>
								</div>
							))
						) : (
							<p className="text-xs text-zinc-500 text-center py-4">No data</p>
						)}
					</div>
				</Card>
			</div>
			<Card>
				<CardHead title="Category Breakdown" />
				{isEditor && (
					<button
						className={`mx-4 mt-4 ${primaryButtonClassName}`}
						onClick={() => setEditing({})}
					>
						+ Add entry
					</button>
				)}
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-100">
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
								{isEditor && (
									<th className="whitespace-nowrap px-5 py-3 text-left font-medium text-zinc-600">
										Actions
									</th>
								)}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{breakdownRows.map((row, index) => {
								const variance = row.budget - row.actual;

								return (
									<tr key={index} className="hover:bg-gray-50">
										<td className="px-4 py-3 font-medium text-zinc-900">
											{row.name}
										</td>
										<td className="px-4 py-3">
											<Badge
												variant={row.type === "income" ? "green" : "blue"}
											>
												{formatLabel(row.type)}
											</Badge>
										</td>
										<td className="px-4 py-3 text-zinc-600">
											INR {row.budget.toLocaleString()}
										</td>
										<td className="px-4 py-3 text-zinc-600">
											INR {row.actual.toLocaleString()}
										</td>
										<td className="px-4 py-3">
											<span
												className={
													variance >= 0
														? "text-emerald-600"
														: "text-rose-600"
												}
											>
												INR {Math.abs(variance).toLocaleString()}{" "}
												{variance >= 0 ? "under" : "over"}
											</span>
										</td>
										<td className="px-4 py-3">
											<Badge variant={variance >= 0 ? "green" : "red"}>
												{variance >= 0 ? "On Track" : "Over Budget"}
											</Badge>
										</td>
										{isEditor && (
											<td className="px-4 py-3 text-xs">
												<button
													className={`${tableActionButtonClassName} mr-2`}
													onClick={() => setEditing(row)}
												>
													Edit
												</button>
												{row.id && (
													<button
														className={tableDangerButtonClassName}
														onClick={() => remove.mutate(row.id)}
													>
														Delete
													</button>
												)}
											</td>
										)}
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</Card>
			{editing !== null && (
				<EntityDrawer
					open
					title={editing?.id ? "Edit finance item" : "Add finance item"}
					initial={editing}
					fields={[
						{ name: "name", label: "Category" },
						{
							name: "type",
							label: "Type",
							type: "select",
							options: ["income", "expense"],
						},
						{ name: "budget", label: "Budget", type: "number" },
						{ name: "actual", label: "Actual", type: "number" },
					]}
					onCancel={() => setEditing(null)}
					onSave={async row => {
						await upsert.mutateAsync(row);
						setEditing(null);
					}}
					onDelete={
						editing?.id
							? async () => {
									await remove.mutateAsync(editing.id as string);
									setEditing(null);
								}
							: undefined
					}
				/>
			)}
		</div>
	);
};
