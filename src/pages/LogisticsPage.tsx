import { useState } from "react";

import {
	useDeleteLogisticsItem,
	useLogisticsItems,
	useUpsertLogisticsItem,
	type LogisticsItemMapped,
} from "@/db/hooks/logisticsItems";
import type { Database } from "@/db/types";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import EntityDrawer from "@/components/EntityDrawer";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionTitle } from "@/components/SectionTitle";
import {
	primaryButtonClassName,
	tableActionButtonClassName,
	tableDangerButtonClassName,
} from "@/components/uiStyles";

import { useConference } from "@/core/ConferenceContext";
import { PAGES_META } from "@/core/data";

type LogisticsItemUpdate = Database["public"]["Tables"]["logistics_items"]["Update"];

export const LogisticsPage = () => {
	const { conferenceId } = useConference();
	const isEditor = useConference()?.isEditor || false;
	const { data: rows = [] } = useLogisticsItems();
	const upsert = useUpsertLogisticsItem();
	const remove = useDeleteLogisticsItem();
	const [editing, setEditing] = useState<LogisticsItemMapped | null>(null);
	const tableRows = rows;

	return (
		<div className="flex gap-4 flex-col">
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
						className={`mx-4 mt-4 ${primaryButtonClassName}`}
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
							{tableRows.map((item, index) => {
								const totalQuantity = item.total_quantity || 0;
								const issuedQuantity = item.issued_quantity || 0;

								const remaining = totalQuantity - issuedQuantity;
								const pct = totalQuantity
									? Math.round((issuedQuantity / totalQuantity) * 100)
									: 0;

								return (
									<tr key={index} className="hover:bg-gray-50">
										<td className="px-4 py-3 font-medium text-zinc-900">
											{item.item_name}
										</td>
										<td className="px-4 py-3 text-zinc-600">
											{totalQuantity.toLocaleString()}
										</td>
										<td className="px-4 py-3 text-zinc-600">
											{issuedQuantity.toLocaleString()}
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
												value={issuedQuantity}
												max={totalQuantity}
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
											{item.vendor_name}
											{item.vendor_contact && ` (${item.vendor_contact})`}
										</td>
										{isEditor && (
											<td className="px-4 py-3 text-xs">
												<button
													className={`${tableActionButtonClassName} mr-2`}
													onClick={() => {
														setEditing(item);
													}}
												>
													Edit
												</button>
												{item.id && (
													<button
														className={tableDangerButtonClassName}
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
						{ name: "item_name", label: "Item" },
						{ name: "total_quantity", label: "Total", type: "number" },
						{ name: "issued_quantity", label: "Issued", type: "number" },
						{ name: "vendor_name", label: "Vendor" },
						{ name: "vendor_contact", label: "Vendor Contact" },
						{ name: "category", label: "Category" },
						{
							name: "status_label",
							label: "Status",
							type: "select",
							options: ["ordered", "received", "shortage"],
						},
						{ name: "notes", label: "Notes", type: "textarea" },
					]}
					onCancel={() => setEditing(null)}
					onSave={async row => {
						await upsert.mutateAsync(row as LogisticsItemUpdate);
						setEditing(null);
					}}
					onDelete={
						editing?.id
							? async () => {
									if (editing.id && confirm("Delete this item?")) {
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
