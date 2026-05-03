import { Link } from "react-router";

import { AlertCircle, CheckCircle, Clock } from "lucide-react";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";

import { DATA, statusVariant, PAGES_META } from "@/core/data";
import { Routes as AppRoutes } from "@/core/navigation";

export const HelpdeskPage = () => (
	<div>
		<SectionTitle
			title={PAGES_META.find(p => p.id === "helpdesk")?.label || "Helpdesk & Issue Tracker"}
			subtitle={PAGES_META.find(p => p.id === "helpdesk")?.description || "Real-time problem management and resolution"}
		/>
		<div className="mb-5 grid grid-cols-3 gap-3">
			<StatCard
				icon={AlertCircle}
				label="Open"
				value={DATA.issues.filter(issue => issue.status === "Open").length}
				color="red"
			/>
			<StatCard
				icon={Clock}
				label="In Progress"
				value={DATA.issues.filter(issue => issue.status === "In Progress").length}
				color="yellow"
			/>
			<StatCard
				icon={CheckCircle}
				label="Resolved"
				value={DATA.issues.filter(issue => issue.status === "Resolved").length}
				color="green"
			/>
		</div>
		<Card>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-gray-200">
							{[
								"ID",
								"Attendee",
								"Issue Type",
								"Priority",
								"Assigned To",
								"Status",
								"Reported",
							].map(header => (
								<th
									key={header}
									scope="col"
									className="whitespace-nowrap px-5 py-3 text-left font-medium text-zinc-500"
								>
									{header}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200">
						{DATA.issues.map((issue, index) => (
							<tr key={index} className="hover:bg-gray-50">
								<td className="px-5 py-3 font-mono text-xs text-blue-600">
									<Link
										to={AppRoutes.helpdesk(issue.id)}
										className="hover:underline"
									>
										{issue.id}
									</Link>
								</td>
								<td className="px-5 py-3 text-zinc-900">
									<Link
										to={AppRoutes.helpdesk(issue.id)}
										className="hover:text-blue-600 hover:underline"
									>
										{issue.name}
									</Link>
								</td>
								<td className="px-5 py-3 text-xs text-zinc-600">{issue.type}</td>
								<td className="px-5 py-3">
									<Badge
										variant={
											issue.priority === "High"
												? "red"
												: issue.priority === "Medium"
													? "yellow"
													: "gray"
										}
									>
										{issue.priority}
									</Badge>
								</td>
								<td className="px-5 py-3 text-xs text-zinc-600">
									{issue.assigned}
								</td>
								<td className="px-5 py-3">
									<Badge variant={statusVariant(issue.status)}>
										{issue.status}
									</Badge>
								</td>
								<td className="px-5 py-3 text-xs text-zinc-600">{issue.age}</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	</div>
);
