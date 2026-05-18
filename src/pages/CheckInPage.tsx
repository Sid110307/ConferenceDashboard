import { useState } from "react";

import { useAttendees, useUpsertAttendee } from "@/db/hooks/attendees";
import type { Database } from "@/db/types";
import { CheckCircle, Clock, Package, QrCode } from "lucide-react";

import { Badge } from "@/components/Badge";
import { Card, CardHead } from "@/components/Card";
import { CountUpNumber } from "@/components/CountUpNumber";
import { ProgressBar } from "@/components/ProgressBar";
import { SearchField } from "@/components/SearchField";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";
import { primaryButtonClassName, secondaryButtonClassName } from "@/components/uiStyles";

import { formatLabel } from "@/core/display";

type SelectedAttendee = {
	id: string;
	first_name?: string | null;
	last_name?: string | null;
	email?: string | null;
	phone?: string | null;
	checked_in_at?: string | null;
	checkin_status?: Database["public"]["Tables"]["attendees"]["Row"]["checkin_status"];
	badge_printed?: boolean;
	attendee_id?: string | null;
	category?: Database["public"]["Tables"]["attendees"]["Row"]["category"];
};

export const CheckInPage = () => {
	const { data: attendees = [] } = useAttendees();
	const upsert = useUpsertAttendee();

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedAttendee, setSelectedAttendee] = useState<SelectedAttendee | null>(null);

	const total = attendees.length;
	const checkedIn = attendees.filter(
		(a: SelectedAttendee) => !!a.checked_in_at || a.checkin_status === "checked_in",
	).length;

	const filteredAttendees: SelectedAttendee[] = attendees.filter((a: SelectedAttendee) => {
		const q = searchQuery.toLowerCase();
		return (
			a.first_name?.toLowerCase().includes(q) ||
			a.last_name?.toLowerCase().includes(q) ||
			a.email?.toLowerCase().includes(q) ||
			a.phone?.includes(q) ||
			a.attendee_id?.includes(q)
		);
	});

	const recentCheckIns: SelectedAttendee[] = attendees
		.filter((a: SelectedAttendee) => !!a.checked_in_at)
		.sort((a: SelectedAttendee, b: SelectedAttendee) => {
			const dateA = new Date(a.checked_in_at ?? "").getTime();
			const dateB = new Date(b.checked_in_at ?? "").getTime();
			return dateB - dateA;
		})
		.map((a: SelectedAttendee) => ({
			...a,
			checked_in_at: a.checked_in_at ? new Date(a.checked_in_at).toISOString() : null,
		}))
		.slice(0, 10);

	const categoryCounts: Record<string, number> = {};
	attendees.forEach((a: SelectedAttendee) => {
		const c = formatLabel((a.category || "Other").toString());
		categoryCounts[c] = (categoryCounts[c] || 0) + 1;
	});
	const colors = ["#60a5fa", "#a78bfa", "#34d399", "#fbbf24", "#f87171"];
	const categoryBreakdown = Object.entries(categoryCounts).map(([name, value], i) => ({
		name,
		value,
		color: colors[i % colors.length],
	}));

	const handleCheckIn = async () => {
		if (!selectedAttendee) return;

		const updated: SelectedAttendee = {
			...selectedAttendee,
			checkin_status: "checked_in",
			checked_in_at: new Date().toISOString(),
		};

		await upsert.mutateAsync(updated);
		setSelectedAttendee(updated);
	};

	const handlePrintBadge = async () => {
		if (!selectedAttendee) return;

		const updated: SelectedAttendee = {
			...selectedAttendee,
			badge_printed: true,
		};

		await upsert.mutateAsync(updated);
		setSelectedAttendee(updated);
	};

	return (
		<div className="flex gap-4 flex-col">
			<SectionTitle
				title="Check-in & Badge Management"
				subtitle="Real-time entry tracking and badge distribution"
			/>
			<div className="mb-5 grid grid-cols-1 sm:grid-cols-2 gap-3 lg:grid-cols-4">
				<StatCard icon={CheckCircle} label="Checked In" value={checkedIn} color="green" />
				<StatCard
					icon={Clock}
					label="Not Checked In"
					value={total - checkedIn}
					color="gray"
				/>
				<StatCard icon={QrCode} label="Badges Printed" value={checkedIn} color="blue" />
				<StatCard icon={Package} label="Kits Distributed" value={0} color="purple" />
			</div>
			<Card className="mb-4">
				<CardHead title="Attendee Search" />
				<div className="p-4">
					<div className="flex gap-3">
						<SearchField
							placeholder="Search by name, email, phone, or ID..."
							value={searchQuery}
							onChange={e => {
								setSearchQuery(e.target.value);
								setSelectedAttendee(null);
							}}
						/>
					</div>

					{searchQuery && filteredAttendees.length > 0 && (
						<div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
							{filteredAttendees.slice(0, 5).map((attendee: SelectedAttendee) => {
								const isCheckedIn =
									!!attendee.checked_in_at ||
									attendee.checkin_status === "checked_in";
								return (
									<button
										key={attendee.id}
										onClick={() => setSelectedAttendee(attendee)}
										className="w-full rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-left text-xs transition-colors hover:bg-gray-100"
									>
										<div className="flex items-center justify-between">
											<div>
												<p className="font-medium text-zinc-900">
													{attendee.first_name} {attendee.last_name}
												</p>
												<p className="text-zinc-500">{attendee.email}</p>
											</div>
											<Badge variant={isCheckedIn ? "green" : "gray"}>
												{isCheckedIn ? "Checked In" : "Pending"}
											</Badge>
										</div>
									</button>
								);
							})}
						</div>
					)}
				</div>
			</Card>

			{selectedAttendee && (
				<Card className="mb-4 border-blue-200 bg-blue-50">
					<CardHead
						title="Attendee Details"
						extra={
							<span className="text-xs font-normal text-zinc-600">
								{selectedAttendee.first_name} {selectedAttendee.last_name}
							</span>
						}
					/>
					<div className="space-y-3 p-4">
						<div className="grid grid-cols-2 gap-3">
							<div>
								<p className="text-xs text-zinc-600">Email</p>
								<p className="font-medium text-zinc-900">
									{selectedAttendee.email}
								</p>
							</div>
							<div>
								<p className="text-xs text-zinc-600">Phone</p>
								<p className="font-medium text-zinc-900">
									{selectedAttendee.phone || "-"}
								</p>
							</div>
							<div>
								<p className="text-xs text-zinc-600">Check-in Status</p>
								<Badge
									variant={selectedAttendee.checked_in_at ? "green" : "yellow"}
								>
									{selectedAttendee.checked_in_at ? "Checked In" : "Not Yet"}
								</Badge>
							</div>
							<div>
								<p className="text-xs text-zinc-600">Badge Printed</p>
								<Badge variant={selectedAttendee.badge_printed ? "green" : "gray"}>
									{selectedAttendee.badge_printed ? "Yes" : "No"}
								</Badge>
							</div>
						</div>
						<div className="flex gap-2 pt-2">
							{!selectedAttendee.checked_in_at && (
								<button
									onClick={handleCheckIn}
									className="flex-1 rounded-md bg-green-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-green-700"
								>
									✓ Check In
								</button>
							)}
							{selectedAttendee.checked_in_at && !selectedAttendee.badge_printed && (
								<button
									onClick={handlePrintBadge}
									className={`${primaryButtonClassName} flex-1`}
								>
									🖨️ Print Badge
								</button>
							)}
							<button
								onClick={() => setSelectedAttendee(null)}
								className={`${secondaryButtonClassName} flex-1`}
							>
								Close
							</button>
						</div>
					</div>
				</Card>
			)}

			<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
				<Card>
					<CardHead title="Check-in by Category" />
					<div className="space-y-4 p-4 sm:p-5">
						<div>
							<div className="mb-1.5 flex justify-between text-xs">
								<span className="text-zinc-600">Overall</span>
								<span className="text-zinc-700">
									<CountUpNumber value={checkedIn} /> / {total}
								</span>
							</div>
							<ProgressBar value={checkedIn} max={total} color="green" />
						</div>
						{categoryBreakdown.map(category => {
							const checkedInCount = Math.round(category.value * (checkedIn / total));
							const pct = Math.min(
								100,
								Math.round((checkedInCount / category.value) * 100),
							);

							return (
								<div key={category.name}>
									<div className="mb-1 flex justify-between text-xs">
										<span className="text-zinc-500">{category.name}</span>
										<span className="text-zinc-600">
											<CountUpNumber value={checkedInCount} /> /{" "}
											{category.value}
										</span>
									</div>
									<div className="flex items-center gap-3">
										<div className="h-2 flex-1 rounded-md bg-gray-200">
											<div
												className="h-2 rounded-md"
												style={{
													width: `${pct}%`,
													backgroundColor: category.color,
												}}
											/>
										</div>
										<span className="w-10 text-right text-xs text-zinc-700">
											<CountUpNumber value={pct} suffix="%" />
										</span>
									</div>
								</div>
							);
						})}
					</div>
				</Card>

				<Card>
					<CardHead title="Recent Check-ins" />
					<div className="divide-y divide-gray-100">
						{recentCheckIns.length ? (
							recentCheckIns.map((attendee: SelectedAttendee) => (
								<div
									key={attendee.id}
									className="flex items-center justify-between px-4 py-3"
								>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-zinc-900">
											{attendee.first_name} {attendee.last_name}
										</p>
										<p className="text-xs text-zinc-500">
											{new Date(
												attendee.checked_in_at ?? "",
											).toLocaleTimeString()}
										</p>
									</div>
									<Badge variant="green">✓</Badge>
								</div>
							))
						) : (
							<div className="flex h-24 items-center justify-center">
								<p className="text-xs text-zinc-500">No check-ins yet today</p>
							</div>
						)}
					</div>
				</Card>
			</div>
		</div>
	);
};
