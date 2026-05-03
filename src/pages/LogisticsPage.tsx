import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionTitle } from "@/components/SectionTitle";

import { DATA, PAGES_META } from "@/core/data";

export const LogisticsPage = () => (
	<div>
		<SectionTitle
			title={PAGES_META.find(p => p.id === "logistics")?.label || "Logistics & Inventory"}
			subtitle={PAGES_META.find(p => p.id === "logistics")?.description || "Conference materials, stock levels, and distribution"}
		/>
		<Card>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-gray-200">
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
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200">
						{DATA.logistics.map((item, index) => {
							const remaining = item.total - item.issued;
							const pct = item.total ? Math.round((item.issued / item.total) * 100) : 0;

							return (
								<tr key={index} className="hover:bg-gray-50">
									<td className="px-5 py-3 font-medium text-zinc-900">
										{item.item}
									</td>
									<td className="px-5 py-3 text-zinc-600">
										{item.total.toLocaleString()}
									</td>
									<td className="px-5 py-3 text-zinc-600">
										{item.issued.toLocaleString()}
									</td>
									<td className="px-5 py-3">
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
									<td className="w-40 px-5 py-3">
										<ProgressBar
											value={item.issued}
											max={item.total}
											color={
												pct >= 90 ? "red" : pct >= 70 ? "yellow" : "green"
											}
										/>
									</td>
									<td className="px-5 py-3 text-xs text-zinc-600">
										{item.vendor}
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
