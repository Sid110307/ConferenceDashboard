import { useState } from "react";

import {
	useDeleteLogisticsItem,
	useLogisticsItems,
	useUpsertLogisticsItem,
} from "@/db/hooks/logisticsItems";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import EntityDrawer from "@/components/EntityDrawer";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionTitle } from "@/components/SectionTitle";

import { useConference } from "@/core/ConferenceContext";
import { PAGES_META } from "@/core/data";

export const LogisticsPage = () => {
	const _conf = useConference();
	const isEditor = _conf?.isEditor || false;
	const { data: rows = [] } = useLogisticsItems();
	const upsert = useUpsertLogisticsItem();
	const remove = useDeleteLogisticsItem();
	const [editing, setEditing] = useState<Record<string, any> | null>(null);
	const tableRows = rows;

	return (
		<div>
			<SectionTitle
				title={PAGES_META.find(p => p.id === "logistics")?.label || "Logistics & Inventory"}
				subtitle={
					PAGES_META.find(p => p.id === "logistics")?.description ||
					"Conference materials, stock levels, and distribution"
				}
			/>
			<Card>
				{isEditor && (
					<button
						className="mx-4 mt-4 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
						onClick={() => setEditing({})}
					>
						+ Add item
					</button>
				)}
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-100">
								{["Item", "Total", "Issued", "Remaining", "% Issued", "Vendor"].map(
									header => (
										<th
											key={header}
											scope="col"
											className="whitespace-nowrap px-5 py-3 text-left font-medium text-zinc-500"
										>
											{header}
										</th>
									),
								)}
								{isEditor && (
									<th className="whitespace-nowrap px-5 py-3 text-left font-medium text-zinc-500">
										Actions
									</th>
								)}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{tableRows.map((item: any, index) => {
								const remaining = item.total - item.issued;
								const pct = item.total
									? Math.round((item.issued / item.total) * 100)
									: 0;

								return (
									<tr key={index} className="hover:bg-gray-50">
										<td className="px-4 py-3 font-medium text-zinc-900">
											{item.item}
										</td>
										<td className="px-4 py-3 text-zinc-600">
											{item.total.toLocaleString()}
										</td>
										<td className="px-4 py-3 text-zinc-600">
											{item.issued.toLocaleString()}
										</td>
										<td className="px-4 py-3">
											<Badge
												variant={
													remaining === 0
														? "red"
														: remaining < 20
															? "yellow"
															: "green"
												}
											>
												{remaining.toLocaleString()}
											</Badge>
										</td>
										<td className="w-40 px-4 py-3">
											<ProgressBar
												value={item.issued}
												max={item.total}
												color={
													pct >= 90
														? "red"
														: pct >= 70
															? "yellow"
															: "green"
												}
											/>
										</td>
										<td className="px-4 py-3 text-xs text-zinc-600">
											{item.vendor}
										</td>
										{isEditor && (
											<td className="px-4 py-3 text-xs">
												<button
													className="mr-2 rounded-md border border-gray-100 px-2 py-1"
													onClick={() => setEditing(item)}
												>
													Edit
												</button>
												{item.id && (
													<button
														className="rounded-md border border-red-200 px-2 py-1 text-red-600"
														onClick={() => remove.mutate(item.id)}
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
					open={editing !== null}
					title={editing?.id ? "Edit logistics item" : "Add logistics item"}
					initial={editing}
					fields={[
						{ name: "item", label: "Item" },
						{ name: "total", label: "Total", type: "number" },
						{ name: "issued", label: "Issued", type: "number" },
						{ name: "vendor", label: "Vendor" },
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
