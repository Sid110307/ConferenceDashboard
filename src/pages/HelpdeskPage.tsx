import { useState } from "react";
import { Link } from "react-router";

import {
	useDeleteHelpdeskIssue,
	useHelpdeskIssues,
	useUpsertHelpdeskIssue,
} from "@/db/hooks/helpdeskIssues";
import { AlertCircle, CheckCircle, Clock } from "lucide-react";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import EntityDrawer from "@/components/EntityDrawer";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";

import { useConference } from "@/core/ConferenceContext";
import { PAGES_META, statusVariant } from "@/core/data";
import { Routes as AppRoutes } from "@/core/navigation";

export const HelpdeskPage = () => {
	const { data: issues = [], isLoading } = useHelpdeskIssues();
	const _conf = useConference();
	const isEditor = _conf?.isEditor || false;
	const upsert = useUpsertHelpdeskIssue();
	const remove = useDeleteHelpdeskIssue();
	const [editing, setEditing] = useState<Record<string, any> | null>(null);

	return (
		<div className="flex gap-4 flex-col">
			<SectionTitle
				title={
					PAGES_META.find(p => p.id === "helpdesk")?.label || "Helpdesk & Issue Tracker"
				}
				subtitle={
					isLoading
						? "Loading issues..."
						: PAGES_META.find(p => p.id === "helpdesk")?.description ||
							"Real-time problem management and resolution"
				}
			/>
			<div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
				<StatCard
					icon={AlertCircle}
					label="Open"
					value={issues.filter(issue => issue.issue_status === "open").length}
					color="red"
				/>
				<StatCard
					icon={Clock}
					label="In Progress"
					value={issues.filter(issue => issue.issue_status === "in_progress").length}
					color="yellow"
				/>
				<StatCard
					icon={CheckCircle}
					label="Resolved"
					value={issues.filter(issue => issue.issue_status === "resolved").length}
					color="green"
				/>
			</div>

			<Card>
				{isEditor && (
					<button
						className="mx-4 mt-4 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
						onClick={() => setEditing({})}
					>
						+ Add issue
					</button>
				)}
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-100">
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
								{isEditor && (
									<th className="whitespace-nowrap px-5 py-3 text-left font-medium text-zinc-500">
										Actions
									</th>
								)}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{issues.map((issue, index) => {
								const statusRaw = (issue.issue_status || "") as string;
								const statusLabel = statusRaw
									? statusRaw
											.replace(/_/g, " ")
											.replace(/\b\w/g, s => s.toUpperCase())
									: "";
								return (
									<tr key={index} className="hover:bg-gray-50">
										<td className="px-4 py-3 font-mono text-xs text-blue-600">
											<Link
												to={AppRoutes.helpdesk(issue.id)}
												className="hover:underline"
											>
												{issue.id}
											</Link>
										</td>
										<td className="px-4 py-3 text-zinc-900">
											<Link
												to={AppRoutes.helpdesk(issue.id)}
												className="hover:text-blue-600 hover:underline"
											>
												{issue.reported_by_name || issue.attendee}
											</Link>
										</td>
										<td className="px-4 py-3 text-xs text-zinc-600">
											{issue.issue_type}
										</td>
										<td className="px-4 py-3">
											<Badge
												variant={
													(issue.priority as string) === "high" ||
													(issue.priority as string) === "High"
														? "red"
														: (issue.priority as string) === "medium" ||
															  (issue.priority as string) ===
																	"Medium"
															? "yellow"
															: "gray"
												}
											>
												{issue.priority}
											</Badge>
										</td>
										<td className="px-4 py-3 text-xs text-zinc-600">
											{issue.assigned_team}
										</td>
										<td className="px-5 py-3">
											<Badge variant={statusVariant(statusLabel)}>
												{statusLabel}
											</Badge>
										</td>
										<td className="px-5 py-3 text-xs text-zinc-600">
											{issue.created_at}
										</td>
										{isEditor && (
											<td className="px-4 py-3 text-xs">
												<button
													className="mr-2 rounded-md px-2 py-1 text-xs border border-gray-100"
													onClick={() => setEditing(issue)}
												>
													Edit
												</button>
												<button
													className="rounded-md px-2 py-1 text-xs border border-red-200 text-red-600"
													onClick={() => remove.mutate(issue.id)}
												>
													Delete
												</button>
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
					title={editing?.id ? "Edit issue" : "Add issue"}
					initial={editing}
					fields={[
						{ name: "reported_by_name", label: "Reported By" },
						{ name: "issue_type", label: "Issue Type" },
						{
							name: "priority",
							label: "Priority",
							type: "select",
							options: ["low", "medium", "high"],
						},
						{ name: "assigned_team", label: "Assigned Team" },
						{
							name: "issue_status",
							label: "Status",
							type: "select",
							options: ["open", "in_progress", "resolved"],
						},
						{ name: "description", label: "Description", type: "textarea" },
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
