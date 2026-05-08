import { useState } from "react";

import { useAccommodationRooms } from "@/db/hooks/accommodationRooms";
import { useAppSettings } from "@/db/hooks/appSettings";
import { useAttendees } from "@/db/hooks/attendees";
import { useHelpdeskIssues } from "@/db/hooks/helpdeskIssues";

import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";

import { PAGES_META } from "@/core/data";

export const SettingsPage = () => {
	const { data: appSettings = [], isLoading: settingsLoading } = useAppSettings();
	const { data: attendees = [], isLoading: attendeesLoading } = useAttendees();
	const { data: issues = [], isLoading: issuesLoading } = useHelpdeskIssues();
	const { data: rooms = [] } = useAccommodationRooms();

	const loading = settingsLoading || attendeesLoading || issuesLoading;

	const [meta, setMeta] = useState<any>({
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
	const roomsAssigned = rooms?.reduce((s: number, r: any) => s + (r.occupied_count || 0), 0) || 0;
	const roomsTotal = rooms?.reduce((s: number, r: any) => s + (r.capacity || 0), 0) || 0;
	const openIssues = issues.filter(i => i.issue_status === "open").length;
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
					<h3 className="mb-4 font-semibold text-zinc-900">Conference Details</h3>
					<div className="space-y-4">
						{[
							{ label: "Conference Name", key: "name" },
							{ label: "Short Name", key: "shortName" },
							{ label: "Dates", key: "dates" },
							{ label: "Venue", key: "venue" },
						].map(field => (
							<div key={field.key}>
								<label className="mb-1.5 block text-xs text-zinc-600">
									{field.label}
								</label>
								<input
									className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors focus:border-blue-500"
									value={meta[field.key as keyof typeof meta] || ""}
									onChange={event =>
										setMeta((prev: any) => ({
											...prev,
											[field.key]: event.target.value,
										}))
									}
								/>
							</div>
						))}
						<button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
							Save Changes
						</button>
					</div>
				</Card>
				<Card className="p-6">
					<h3 className="mb-4 font-semibold text-zinc-900">Live Overview</h3>
					<div className="space-y-3">
						{[
							["Current Day", `Day ${meta.currentDay} of 3`, "text-zinc-900"],
							["Total Capacity", totalCapacity, "text-zinc-900"],
							[
								"Check-in Rate",
								totalCapacity
									? `${Math.round((checkedInCount / totalCapacity) * 100)}%`
									: "N/A",
								"text-green-400",
							],
							[
								"Room Occupancy",
								`${Math.round((roomsTotal ? roomsAssigned / roomsTotal : 0) * 100)}%`,
								"text-blue-400",
							],
							["Open Issues", openIssues, "text-red-400"],
							["VIP Confirmed", vipConfirmed, "text-yellow-400"],
						].map(([label, value, colorClass]) => (
							<div
								key={String(label)}
								className="flex items-center justify-between border-b border-gray-200 py-1 last:border-0"
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
