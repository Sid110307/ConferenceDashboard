import { useState } from "react";

import { useAccommodationRooms } from "@/db/hooks/accommodationRooms";
import { useAttendees } from "@/db/hooks/attendees";
import { useConferenceDetails } from "@/db/hooks/conferences";
import { useHelpdeskIssues } from "@/db/hooks/helpdeskIssues";
import { AlertCircle, Database, Palette, Settings, Shield, Users } from "lucide-react";

import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";

import { PAGES_META } from "@/core/data";

export const SettingsPage = () => {
	const { data: conference } = useConferenceDetails();
	const { data: attendees = [] } = useAttendees();
	const { data: issues = [] } = useHelpdeskIssues();
	const { data: rooms = [] } = useAccommodationRooms();

	const [meta, setMeta] = useState({
		name: conference?.name || "",
		shortName: conference?.short_name || "",
		dates: `${conference?.start_date} — ${conference?.end_date}` || "",
		venue: conference?.venue_name || "",
		currentDay: conference?.current_day || 1,
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

	const sections = [
		{
			title: "Conference Profile",
			icon: Settings,
			description: "Core conference information",
			fields: [
				{ label: "Conference Name", key: "name" },
				{ label: "Short Name", key: "shortName" },
				{ label: "Dates", key: "dates" },
				{ label: "Venue", key: "venue" },
			],
		},
		{
			title: "Theme & Branding",
			icon: Palette,
			description: "Visual settings",
			fields: [],
		},
		{
			title: "Roles & Access",
			icon: Shield,
			description: "User roles and permissions",
			fields: [],
		},
		{
			title: "Data Management",
			icon: Database,
			description: "Import/export and backup",
			fields: [],
		},
	];

	return (
		<div>
			<SectionTitle
				title={PAGES_META.find(p => p.id === "settings")?.label || "Settings"}
				subtitle={
					PAGES_META.find(p => p.id === "settings")?.description ||
					"Conference metadata and dashboard settings"
				}
			/>
			<div className="mb-4">
				<div className="mb-3 flex items-center gap-2">
					<Settings size={20} className="text-zinc-900" />
					<div>
						<h2 className="text-lg font-semibold text-zinc-900">Conference Profile</h2>
						<p className="text-xs text-zinc-500">Core conference information</p>
					</div>
				</div>
				<Card className="p-6">
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
							Save Conference Details
						</button>
					</div>
				</Card>
			</div>
			<div className="mb-4">
				<div className="mb-3 flex items-center gap-2">
					<Users size={20} className="text-zinc-900" />
					<div>
						<h2 className="text-lg font-semibold text-zinc-900">Live Overview</h2>
						<p className="text-xs text-zinc-500">Current conference status</p>
					</div>
				</div>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{[
						["Current Day", `Day ${meta.currentDay}`, "text-blue-600"],
						["Total Capacity", `${totalCapacity} attendees`, "text-zinc-900"],
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
						["Open Issues", `${openIssues} issues`, "text-rose-600"],
						["VIP Confirmed", `${vipConfirmed} VIPs`, "text-amber-600"],
					].map(([label, value, colorClass]) => (
						<Card key={String(label)} className="p-4">
							<p className="text-xs font-medium text-zinc-600">{label}</p>
							<p className={`mt-2 text-2xl font-semibold ${colorClass}`}>{value}</p>
						</Card>
					))}
				</div>
			</div>
			<div className="mb-4">
				<div className="mb-3 flex items-center gap-2">
					<Palette size={20} className="text-zinc-900" />
					<div>
						<h2 className="text-lg font-semibold text-zinc-900">Theme & Branding</h2>
						<p className="text-xs text-zinc-500">Visual customization</p>
					</div>
				</div>
				<Card className="p-6">
					<div className="space-y-4">
						<div>
							<label className="mb-1.5 block text-xs font-medium text-zinc-600">
								Primary Color
							</label>
							<div className="flex items-center gap-3">
								<input
									type="color"
									value="#2563eb"
									className="h-10 w-16 rounded-md border border-gray-200 cursor-pointer"
								/>
								<span className="text-sm text-zinc-600">#2563eb</span>
							</div>
						</div>
						<button className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700">
							Save Theme
						</button>
					</div>
				</Card>
			</div>
			<div className="mb-4">
				<div className="mb-3 flex items-center gap-2">
					<Shield size={20} className="text-zinc-900" />
					<div>
						<h2 className="text-lg font-semibold text-zinc-900">Roles & Access</h2>
						<p className="text-xs text-zinc-500">User permissions and roles</p>
					</div>
				</div>
				<Card className="p-6">
					<div className="space-y-3">
						{["Admin", "Staff", "Viewer"].map(role => (
							<div
								key={role}
								className="flex items-center justify-between rounded-md bg-gray-50 p-3"
							>
								<span className="text-sm font-medium text-zinc-900">{role}</span>
								<button className="rounded-md border border-gray-200 bg-white px-3 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-gray-50">
									Manage
								</button>
							</div>
						))}
					</div>
				</Card>
			</div>
			<div>
				<div className="mb-3 flex items-center gap-2">
					<AlertCircle size={20} className="text-red-600" />
					<div>
						<h2 className="text-lg font-semibold text-zinc-900">Danger Zone</h2>
						<p className="text-xs text-zinc-500">Irreversible actions</p>
					</div>
				</div>
				<Card className="border-red-200 bg-red-50 p-6">
					<button className="rounded-md border border-red-300 bg-red-100 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-200">
						Reset Conference Data
					</button>
				</Card>
			</div>
		</div>
	);
};
