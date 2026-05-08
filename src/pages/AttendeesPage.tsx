import { useMemo, useState } from "react";
import { Link } from "react-router";

import { useAttendees, useDeleteAttendee, useUpsertAttendee } from "@/db/hooks/attendees";
import { Search } from "lucide-react";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import EntityDrawer from "@/components/EntityDrawer";
import { SectionTitle } from "@/components/SectionTitle";

import { useConference } from "@/core/ConferenceContext";
import { categoryVariant, PAGES_META, statusVariant } from "@/core/data";
import { Routes as AppRoutes } from "@/core/navigation";

export const AttendeesPage = () => {
	const [search, setSearch] = useState("");
	const { data: attendees = [], isLoading } = useAttendees();
	const { isEditor } = useConference();
	const upsert = useUpsertAttendee();
	const remove = useDeleteAttendee();
	const [editing, setEditing] = useState<Record<string, any> | null>(null);

	const categories = Array.from(new Set(attendees.map(a => a.category || "").filter(Boolean)));
	const statuses = Array.from(
		new Set(
			attendees.map(a => a.checkin_status || a.registration_status || "").filter(Boolean),
		),
	);
	const [catFilter, setCatFilter] = useState<string | "All">("All");
	const [statusFilter, setStatusFilter] = useState<string | "All">("All");

	const filtered = useMemo(
		() =>
			(attendees || []).filter(attendee => {
				const query = search.trim().toLowerCase();
				const matchesQuery =
					!query ||
					(attendee.name || "").toLowerCase().includes(query) ||
					(attendee.institution || "").toLowerCase().includes(query) ||
					(attendee.id || "").toLowerCase().includes(query) ||
					(attendee.city || "").toLowerCase().includes(query) ||
					(attendee.state || "").toLowerCase().includes(query);
				const matchesCategory =
					catFilter === "All" || (attendee.category || "") === catFilter;
				const attendeeStatus = (attendee.checkin_status ||
					attendee.registration_status ||
					"") as string;
				const matchesStatus = statusFilter === "All" || attendeeStatus === statusFilter;
				return matchesQuery && matchesCategory && matchesStatus;
			}),
		[search, catFilter, statusFilter, attendees],
	);

	return (
		<div>
			<SectionTitle
				title={PAGES_META.find(p => p.id === "attendees")?.label || "Attendees"}
				subtitle={
					isLoading
						? "Loading attendees..."
						: `${attendees.length} registered participants across ${categories.length} categories`
				}
			/>
			<div className="mb-5 grid grid-cols-3 gap-3 lg:grid-cols-6">
				{(categories.length
					? categories.map(name => ({
							name,
							value: attendees.filter(a => a.category === name).length,
						}))
					: []
				).map(category => (
					<Card
						key={category.name}
						className={`cursor-pointer p-3 text-center transition-colors ${catFilter === category.name ? "border-blue-500" : "hover:border-gray-200"}`}
						onClick={() =>
							setCatFilter(catFilter === category.name ? "All" : category.name)
						}
					>
						<div className="text-2xl font-semibold text-zinc-900">{category.value}</div>
						<div className="mt-0.5 text-xs text-zinc-600">{category.name}</div>
					</Card>
				))}
			</div>
			<Card className="mb-3">
				<div className="flex flex-wrap items-center gap-2 p-3">
					<div className="flex min-w-48 flex-1 items-center gap-2 rounded-lg bg-white px-3 py-2 border border-gray-200">
						<Search size={14} className="text-zinc-500" />
						<input
							className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-500"
							placeholder="Search by name, ID or institution..."
							value={search}
							onChange={event => setSearch(event.target.value)}
						/>
					</div>
					<select
						className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none"
						value={catFilter}
						onChange={event => setCatFilter(event.target.value)}
					>
						{["All", ...categories].map(category => (
							<option key={category}>{category}</option>
						))}
					</select>
					<select
						className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none"
						value={statusFilter}
						onChange={event => setStatusFilter(event.target.value)}
					>
						{["All", ...statuses].map(status => (
							<option key={status}>{status}</option>
						))}
					</select>
					{isEditor && (
						<button
							className="ml-auto rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
							onClick={() => setEditing({})}
						>
							+ Add attendee
						</button>
					)}
				</div>
			</Card>
			<Card>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="border-b border-gray-200">
								{[
									"ID",
									"Name",
									"Institution",
									"State",
									"Category",
									"Status",
									"Travel",
								].map(header => (
									<th
										key={header}
										scope="col"
										className="whitespace-nowrap px-5 py-3 text-left font-medium text-zinc-600"
									>
										{header}
									</th>
								))}
								{isEditor && (
									<th className="whitespace-nowrap px-5 py-3 text-left font-medium text-zinc-600">
										Actions
									</th>
								)}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200">
							{filtered.map(attendee => (
								<tr
									key={attendee.id}
									className="transition-colors hover:bg-gray-50"
								>
									<td className="px-5 py-3 font-mono text-xs text-blue-600">
										<Link
											to={AppRoutes.attendees(attendee.id)}
											className="hover:underline"
										>
											{attendee.id}
										</Link>
									</td>
									<td className="whitespace-nowrap px-5 py-3 font-medium text-zinc-900">
										<Link
											to={AppRoutes.attendees(attendee.id)}
											className="hover:text-blue-600 hover:underline"
										>
											{attendee.name}
										</Link>
									</td>
									<td className="px-5 py-3 text-sm text-zinc-600">
										{attendee.institution}
									</td>
									<td className="whitespace-nowrap px-5 py-3 text-xs text-zinc-600">
										{attendee.state}
									</td>
									<td className="px-5 py-3">
										<Badge
											variant={categoryVariant(
												String(attendee.category || ""),
											)}
										>
											{String(attendee.category || "")}
										</Badge>
									</td>
									<td className="px-5 py-3">
										<Badge
											variant={statusVariant(
												String(
													attendee.checkin_status ||
														attendee.registration_status ||
														"",
												),
											)}
										>
											{String(
												attendee.checkin_status ||
													attendee.registration_status ||
													"",
											)}
										</Badge>
									</td>
									<td className="px-5 py-3 text-xs text-zinc-500">
										{attendee.travel_mode}
									</td>
									{isEditor && (
										<td className="px-5 py-3 text-xs">
											<button
												className="mr-2 rounded px-2 py-1 text-xs border border-gray-200"
												onClick={() => setEditing(attendee)}
											>
												Edit
											</button>
											<button
												className="rounded px-2 py-1 text-xs border border-red-200 text-red-600"
												onClick={() => remove.mutate(attendee.id)}
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
					title={editing?.id ? "Edit attendee" : "Add attendee"}
					initial={editing}
					fields={[
						{ name: "name", label: "Name" },
						{ name: "institution", label: "Institution" },
						{ name: "state", label: "State" },
						{ name: "category", label: "Category" },
						{
							name: "checkin_status",
							label: "Check-in Status",
							type: "select",
							options: ["checked_in", "not_checked_in"],
						},
						{
							name: "registration_status",
							label: "Registration Status",
							type: "select",
							options: ["registered", "pending", "cancelled"],
						},
						{ name: "travel_mode", label: "Travel Mode" },
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
