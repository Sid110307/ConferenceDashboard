import { Link } from "react-router";

import { CheckCircle, Clock, TrendingUp, UserCheck } from "lucide-react";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";

import { DATA, PAGES_META } from "@/core/data";
import { Routes as AppRoutes } from "@/core/navigation";

export const VolunteersPage = () => (
	<div>
		<SectionTitle
			title={PAGES_META.find(p => p.id === "volunteers")?.label || "Volunteers"}
			subtitle={PAGES_META.find(p => p.id === "volunteers")?.description || "Team assignments, shifts, and on-ground operations"}
		/>
		<div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
			<StatCard
				icon={UserCheck}
				label="Total Volunteers"
				value={DATA.volunteers.length}
				color="blue"
			/>
			<StatCard
				icon={CheckCircle}
				label="Currently Active"
				value={DATA.volunteers.filter(volunteer => volunteer.status === "Active").length}
				color="green"
			/>
			<StatCard
				icon={Clock}
				label="On Break"
				value={DATA.volunteers.filter(volunteer => volunteer.status === "On Break").length}
				color="yellow"
			/>
			<StatCard
				icon={TrendingUp}
				label="Teams Deployed"
				value={[...new Set(DATA.volunteers.map(volunteer => volunteer.team))].length}
				color="purple"
			/>
		</div>
		<Card>
			<div className="overflow-x-auto">
				<table className="w-full text-sm">
					<thead>
						<tr className="border-b border-gray-200">
							{["Name", "Role", "Location", "Shift", "Team", "Status"].map(header => (
								<th
									key={header}
									scope="col"
									className="whitespace-nowrap px-5 py-3 text-left font-medium text-zinc-600"
								>
									{header}
								</th>
							))}
						</tr>
					</thead>
					<tbody className="divide-y divide-gray-200">
						{DATA.volunteers.map((volunteer, index) => (
							<tr key={index} className="hover:bg-gray-50">
								<td className="px-5 py-3 font-medium text-zinc-900">
									<Link
										to={AppRoutes.volunteers(
											volunteer.name.replace(/\s+/g, "-").toLowerCase(),
										)}
										className="hover:text-blue-600 hover:underline"
									>
										{volunteer.name}
									</Link>
								</td>
								<td className="px-5 py-3 text-xs text-zinc-600">
									{volunteer.role}
								</td>
								<td className="px-5 py-3 text-xs text-zinc-600">
									{volunteer.location}
								</td>
								<td className="px-5 py-3 font-mono text-xs text-zinc-600">
									{volunteer.shift}
								</td>
								<td className="px-5 py-3">
									<Badge variant="blue">{volunteer.team}</Badge>
								</td>
								<td className="px-5 py-3">
									<Badge
										variant={volunteer.status === "Active" ? "green" : "yellow"}
									>
										{volunteer.status}
									</Badge>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</Card>
	</div>
);
