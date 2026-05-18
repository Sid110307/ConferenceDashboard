import { useState } from "react";
import { Link } from "react-router";

import { useDeleteVolunteer, useUpsertVolunteer, useVolunteers } from "@/db/hooks/volunteers.ts";
import type { Database } from "@/db/types";
import { CheckCircle, Clock, TrendingUp, UserCheck } from "lucide-react";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import EntityDrawer from "@/components/EntityDrawer";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";
import {
	primaryButtonClassName,
	tableActionButtonClassName,
	tableDangerButtonClassName,
} from "@/components/uiStyles";

import { useConference } from "@/core/ConferenceContext";
import { PAGES_META } from "@/core/data";
import { formatLabel } from "@/core/display";
import { Routes as AppRoutes } from "@/core/navigation";

type VolunteerUpdate = Database["public"]["Tables"]["volunteers"]["Update"];

export const VolunteersPage = () => {
	const { data: volunteers = [], isLoading } = useVolunteers();
	const { conferenceId } = useConference();
	const isEditor = useConference()?.isEditor || false;
	const upsert = useUpsertVolunteer();
	const remove = useDeleteVolunteer();
	const [editing, setEditing] = useState<VolunteerUpdate | null>(null);
	return (
		<div className="flex gap-4 flex-col">
			<SectionTitle
				title={PAGES_META.find(p => p.id === "volunteers")?.label || "Volunteers"}
				subtitle={
					PAGES_META.find(p => p.id === "volunteers")?.description ||
					"Team assignments, shifts, and on-ground operations"
				}
			/>
			<div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
				<StatCard
					icon={UserCheck}
					label="Total Volunteers"
					value={isLoading ? "Loading..." : volunteers.length}
					color="blue"
				/>
				<StatCard
					icon={CheckCircle}
					label="Currently Active"
					value={
						isLoading
							? "Loading..."
							: volunteers.filter(
									volunteer =>
										formatLabel(String(volunteer.status_label)) === "Active",
								).length
					}
					color="green"
				/>
				<StatCard
					icon={Clock}
					label="On Break"
					value={
						isLoading
							? "Loading..."
							: volunteers.filter(
									volunteer =>
										String(volunteer.status_label).toLowerCase() ===
											"on break" ||
										String(volunteer.status_label).toLowerCase() === "on_break",
								).length
					}
					color="yellow"
				/>
				<StatCard
					icon={TrendingUp}
					label="Teams Deployed"
					value={
						isLoading
							? "Loading..."
							: [...new Set(volunteers.map(volunteer => String(volunteer.team)))]
									.length
					}
					color="purple"
				/>
			</div>
			<Card>
				{isEditor && (
					<button
						className={`mx-4 mt-4 ${primaryButtonClassName}`}
						onClick={() => setEditing({})}
					>
						+ Add volunteer
					</button>
				)}
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-100">
								{["Name", "Role", "Location", "Shift", "Team", "Status"].map(
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
							{volunteers.map((volunteer, index) => (
								<tr key={index} className="hover:bg-gray-50">
									<td className="px-4 py-3 font-medium text-zinc-900">
										<Link
											to={AppRoutes.volunteers(
												conferenceId,
												(volunteer.name || "")
													.replace(/\s+/g, "-")
													.toLowerCase(),
											)}
											className="hover:text-blue-600 hover:underline"
										>
											{volunteer.name}
										</Link>
									</td>
									<td className="px-4 py-3 text-xs text-zinc-600">
										{volunteer.role}
									</td>
									<td className="px-4 py-3 text-xs text-zinc-600">
										{volunteer.location}
									</td>
									<td className="px-4 py-3 font-mono text-xs text-zinc-600">
										{volunteer.shift_start
											? `${new Date(volunteer.shift_start).toLocaleTimeString(
													[],
													{
														hour: "2-digit",
														minute: "2-digit",
													},
												)}${
													volunteer.shift_end
														? ` - ${new Date(
																volunteer.shift_end,
															).toLocaleTimeString([], {
																hour: "2-digit",
																minute: "2-digit",
															})}`
														: ""
												}`
											: ""}
									</td>
									<td className="px-4 py-3">
										<Badge variant="blue">
											{formatLabel(String(volunteer.team || ""))}
										</Badge>
									</td>
									<td className="px-4 py-3">
										<Badge
											variant={
												formatLabel(String(volunteer.status_label)) ===
												"Active"
													? "green"
													: "yellow"
											}
										>
											{formatLabel(String(volunteer.status_label || ""))}
										</Badge>
									</td>
									{isEditor && (
										<td className="px-4 py-3 text-xs">
											<button
												className={`${tableActionButtonClassName} mr-2`}
												onClick={() => setEditing(volunteer)}
											>
												Edit
											</button>
											<button
												className={tableDangerButtonClassName}
												onClick={() => remove.mutate(volunteer.id)}
											>
												Delete
											</button>
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
					title={editing?.id ? "Edit volunteer" : "Add volunteer"}
					initial={editing}
					fields={[
						{ name: "name", label: "Name" },
						{ name: "role", label: "Role" },
						{ name: "location", label: "Location" },
						{ name: "shift_start", label: "Shift Start" },
						{ name: "shift_end", label: "Shift End" },
						{ name: "team", label: "Team" },
						{
							name: "status_label",
							label: "Status",
							type: "select",
							options: ["active", "inactive", "on_break", "completed"],
						},
					]}
					onCancel={() => setEditing(null)}
					onSave={async row => {
						await upsert.mutateAsync(row);
						setEditing(null);
					}}
					onDelete={
						editing?.id
							? async () => {
									if (editing.id && confirm("Delete this volunteer?")) {
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
