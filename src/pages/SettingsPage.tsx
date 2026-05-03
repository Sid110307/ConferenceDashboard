import { useState } from "react";

import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";

import { DATA, PAGES_META } from "@/core/data";

export const SettingsPage = () => {
	const [meta, setMeta] = useState(DATA.meta);

	return (
		<div>
			<SectionTitle
				title={PAGES_META.find(p => p.id === "settings")?.label || "Settings"}
				subtitle={PAGES_META.find(p => p.id === "settings")?.description || "Conference metadata and dashboard settings"}
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
										setMeta(prev => ({
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
							["Current Day", `Day ${DATA.meta.currentDay} of 3`, "text-zinc-900"],
							["Total Capacity", DATA.overview.total, "text-zinc-900"],
							[
								"Check-in Rate",
								`${Math.round((DATA.overview.checkedIn / DATA.overview.total) * 100)}%`,
								"text-green-400",
							],
							[
								"Room Occupancy",
								`${Math.round((DATA.overview.roomsAssigned / DATA.overview.roomsTotal) * 100)}%`,
								"text-blue-400",
							],
							["Open Issues", DATA.overview.openIssues, "text-red-400"],
							["VIP Confirmed", DATA.overview.vip, "text-yellow-400"],
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
