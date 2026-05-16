import { useState } from "react";

import { useAccommodationRooms } from "@/db/hooks/accommodationRooms";
import { useAttendees } from "@/db/hooks/attendees";
import { useHelpdeskIssues } from "@/db/hooks/helpdeskIssues";

import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";

import { PAGES_META } from "@/core/data";

export const SettingsPage = () => {
	const { data: attendees = [] } = useAttendees();
	const { data: issues = [] } = useHelpdeskIssues();
	const { data: rooms = [] } = useAccommodationRooms();

	const [meta, setMeta] = useState({
		name: "",
		shortName: "",
		dates: "",
		venue: "",
		currentDay: 1,
	});

	const totalCapacity = attendees.length || 0;
	const checkedInCount = attendees.filter(
		a => !!a.checked_in_at || a.checkin_status === "checked_in",
	).length;
	const roomsAssigned = rooms.reduce(
		(sum: number, room: any) => sum + (room.occupied_count || 0),
		0,
	);
	const roomsTotal = rooms.reduce((sum: number, room: any) => sum + (room.capacity || 0), 0);
	const openIssues = issues.filter(issue => issue.issue_status === "open").length;
	const vipConfirmed = attendees.filter(
		a => (a.category || "").toString().toLowerCase() === "vip",
	).length;

	return (
		<div>
			<SectionTitle
				title={PAGES_META.find(p => p.id === "settings")?.label || "Settings"}
				subtitle={
					PAGES_META.find(p => p.id === "settings")?.description ||
					"Conference metadata and dashboard settings"
				}
			/>

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Card className="p-6">
					<h3 className="mb-4 text-sm font-semibold tracking-tight text-zinc-900">
						Conference Details
					</h3>
					<div className="space-y-4">
						{[
							{ label: "Conference Name", key: "name" },
							{ label: "Short Name", key: "shortName" },
							{ label: "Dates", key: "dates" },
							{ label: "Venue", key: "venue" },
						].map(field => (
							<div key={field.key}>
								<label className="mb-1.5 block text-xs font-medium text-zinc-600">
									{field.label}
								</label>
								<input
									className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
									value={meta[field.key as keyof typeof meta] || ""}
									onChange={event =>
										setMeta(prev => ({
											...prev,
											[field.key]: event.target.value,
										}))
									}
								/>
							</div>
						))}
						<button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700">
							Save Changes
						</button>
					</div>
				</Card>

				<Card className="p-6">
					<h3 className="mb-4 text-sm font-semibold tracking-tight text-zinc-900">
						Live Overview
					</h3>
					<div className="space-y-3">
						{[
							["Current Day", `Day ${meta.currentDay} of 3`, "text-zinc-900"],
							["Total Capacity", totalCapacity, "text-zinc-900"],
							[
								"Check-in Rate",
								totalCapacity
									? `${Math.round((checkedInCount / totalCapacity) * 100)}%`
									: "N/A",
								"text-emerald-600",
							],
							[
								"Room Occupancy",
								`${Math.round((roomsTotal ? roomsAssigned / roomsTotal : 0) * 100)}%`,
								"text-blue-600",
							],
							["Open Issues", openIssues, "text-rose-600"],
							["VIP Confirmed", vipConfirmed, "text-amber-600"],
						].map(([label, value, colorClass]) => (
							<div
								key={String(label)}
								className="flex items-center justify-between border-b border-gray-100 py-1.5 last:border-0"
							>
								<span className="text-sm text-zinc-600">{label}</span>
								<span className={`text-sm font-medium ${colorClass}`}>{value}</span>
							</div>
						))}
					</div>
				</Card>
			</div>
		</div>
	);
};
