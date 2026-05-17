import { useMemo, useState } from "react";
import { Link } from "react-router";

import { useAttendees, useDeleteAttendee, useUpsertAttendee } from "@/db/hooks/attendees";
import type { Database } from "@/db/types.ts";
import {
	Search,
	ShieldCheck,
	UserCheck,
	UserCog,
	UserRound,
	Users,
	UsersRound,
	type LucideIcon,
} from "lucide-react";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import EntityDrawer from "@/components/EntityDrawer";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";

import { useConference } from "@/core/ConferenceContext";
import { categoryVariant, PAGES_META, statusVariant } from "@/core/data";
import { formatLabel } from "@/core/display";
import { Routes as AppRoutes } from "@/core/navigation";

type AttendeeUpdate = Database["public"]["Tables"]["attendees"]["Update"];

const categoryIconPool: LucideIcon[] = [
	Users,
	UsersRound,
	UserRound,
	UserCheck,
	UserCog,
	ShieldCheck,
];

const getCategoryIcon = (categoryName: string) => {
	const hash = categoryName.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
	return categoryIconPool[hash % categoryIconPool.length];
};

export const AttendeesPage = () => {
	const [search, setSearch] = useState("");
	const { data: attendees = [], isLoading } = useAttendees();
	const { conferenceId } = useConference();
	const isEditor = useConference()?.isEditor || false;
	const upsert = useUpsertAttendee();
	const remove = useDeleteAttendee();
	const [editing, setEditing] = useState<AttendeeUpdate | null>(null);

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
		<div className="flex gap-4 flex-col">
			<SectionTitle
				title={PAGES_META.find(p => p.id === "attendees")?.label || "Attendees"}
				subtitle={
					isLoading
						? "Loading attendees..."
						: `${attendees.length} registered participants across ${categories.length} categories`
				}
			/>
			<div className="mb-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
				{(categories.length
					? categories.map(name => ({
							name: formatLabel(name),
							value: attendees.filter(a => a.category === name).length,
						}))
					: []
				).map(category => {
					const CategoryIcon = getCategoryIcon(category.name);
					return (
						<StatCard
							key={category.name}
							icon={CategoryIcon}
							label={category.name}
							value={category.value}
							sub="participants"
							color="blue"
							className={
								catFilter === category.name
									? "border-blue-200 bg-blue-50/80 ring-1 ring-inset ring-blue-100 shadow-sm"
									: ""
							}
							onClick={() =>
								setCatFilter(catFilter === category.name ? "All" : category.name)
							}
						/>
					);
				})}
			</div>
			<Card className="mb-3">
				<div className="flex flex-col gap-2 p-3 sm:flex-row sm:flex-wrap sm:items-center">
					<div className="flex min-w-0 flex-1 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm">
						<Search size={14} className="text-zinc-500" />
						<input
							className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
							placeholder="Search by name, ID or institution..."
							value={search}
							onChange={event => setSearch(event.target.value)}
						/>
					</div>
					<select
						className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
						value={catFilter}
						onChange={event => setCatFilter(event.target.value)}
					>
						{["All", ...categories].map(category => (
							<option key={category}>{formatLabel(category)}</option>
						))}
					</select>
					<select
						className="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-zinc-700 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
						value={statusFilter}
						onChange={event => setStatusFilter(event.target.value)}
					>
						{["All", ...statuses].map(status => (
							<option key={status}>{status}</option>
						))}
					</select>
					{isEditor && (
						<button
							className="rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700 sm:ml-auto"
							onClick={() =>
								setEditing({} as Database["public"]["Tables"]["attendees"]["Row"])
							}
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
							<tr className="border-b border-gray-100">
								{[
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
										className="whitespace-nowrap px-4 py-3 text-left font-medium text-zinc-600"
									>
										{header}
									</th>
								))}
								{isEditor && (
									<th className="whitespace-nowrap px-4 py-3 text-left font-medium text-zinc-600">
										Actions
									</th>
								)}
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-100">
							{filtered.map(attendee => (
								<tr
									key={attendee.id}
									className="transition-colors hover:bg-gray-50"
								>
									<td className="whitespace-nowrap px-4 py-3 font-medium text-zinc-900">
										<Link
											to={AppRoutes.attendees(conferenceId, attendee.id)}
											className="hover:text-blue-600 hover:underline"
										>
											{attendee.name}
										</Link>
									</td>
									<td className="px-4 py-3 text-sm text-zinc-600">
										{attendee.institution}
									</td>
									<td className="whitespace-nowrap px-4 py-3 text-xs text-zinc-600">
										{attendee.state}
									</td>
									<td className="px-4 py-3">
										<Badge
											variant={categoryVariant(
												String(attendee.category || ""),
											)}
										>
											{formatLabel(String(attendee.category || ""))}
										</Badge>
									</td>
									<td className="px-4 py-3">
										<Badge
											variant={statusVariant(
												String(
													attendee.checkin_status ||
														attendee.registration_status ||
														"",
												),
											)}
										>
											{formatLabel(
												String(
													attendee.checkin_status ||
														attendee.registration_status ||
														"",
												),
											)}
										</Badge>
									</td>
									<td className="px-4 py-3 text-xs text-zinc-500">
										{attendee.travel_mode}
									</td>
									{isEditor && (
										<td className="px-4 py-3 text-xs">
											<button
												className="mr-2 rounded-md px-2 py-1 text-xs border border-gray-100"
												onClick={() => setEditing(attendee)}
											>
												Edit
											</button>
											<button
												className="rounded-md px-2 py-1 text-xs border border-red-200 text-red-600"
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
					open
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
									if (editing.id && confirm("Delete this attendee?")) {
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
