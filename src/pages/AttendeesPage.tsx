import { useMemo, useState } from "react";
import { Link } from "react-router";

import { Search } from "lucide-react";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";

import { categoryVariant, DATA, statusVariant, PAGES_META } from "@/core/data";
import { Routes as AppRoutes } from "@/core/navigation";

export const AttendeesPage = () => {
	const [search, setSearch] = useState("");
	const categories = DATA.categoryBreakdown.map(c => c.name);
	const statuses = Array.from(new Set(DATA.attendees.map(a => a.status)));
	const [catFilter, setCatFilter] = useState<string | "All">("All");
	const [statusFilter, setStatusFilter] = useState<string | "All">("All");

	const filtered = useMemo(
		() =>
			DATA.attendees.filter(attendee => {
				const query = search.trim().toLowerCase();
				const matchesQuery = !query ||
					attendee.name.toLowerCase().includes(query) ||
					attendee.institution.toLowerCase().includes(query) ||
					attendee.id.toLowerCase().includes(query) ||
					attendee.city.toLowerCase().includes(query) ||
					attendee.state.toLowerCase().includes(query);
				const matchesCategory = catFilter === "All" || attendee.category === catFilter;
				const matchesStatus = statusFilter === "All" || attendee.status === statusFilter;
				return matchesQuery && matchesCategory && matchesStatus;
			}),
		[search, catFilter, statusFilter],
	);

	return (
		<div>
			<SectionTitle
				title={PAGES_META.find(p => p.id === "attendees")?.label || "Attendees"}
				subtitle={`${DATA.overview.total} registered participants across ${DATA.categoryBreakdown.length} categories`}
			/>
			<div className="mb-5 grid grid-cols-3 gap-3 lg:grid-cols-6">
				{DATA.categoryBreakdown.map(category => (
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
					<span className="text-xs text-zinc-600">
						{filtered.length} result{filtered.length !== 1 ? "s" : ""}
					</span>
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
										<Badge variant={categoryVariant(attendee.category)}>
											{attendee.category}
										</Badge>
									</td>
									<td className="px-5 py-3">
										<Badge variant={statusVariant(attendee.status)}>
											{attendee.status}
										</Badge>
									</td>
									<td className="px-5 py-3 text-xs text-zinc-500">
										{attendee.travel}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</Card>
		</div>
	);
};
