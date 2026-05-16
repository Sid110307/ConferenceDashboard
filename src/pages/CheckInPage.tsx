import { useState } from "react";



import { useAttendees, useUpsertAttendee } from "@/db/hooks/attendees";
import { CheckCircle, Clock, Package, QrCode, Search } from "lucide-react";



import { Badge } from "@/components/Badge";
import { Card, CardHead } from "@/components/Card";
import { CountUpNumber } from "@/components/CountUpNumber";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";





export const CheckInPage = () => {
	const { data: attendees = [] } = useAttendees();
	const upsert = useUpsertAttendee();

	const [searchQuery, setSearchQuery] = useState("");
	const [selectedAttendee, setSelectedAttendee] = useState<any>(null);

	const total = attendees.length;
	const checkedIn = attendees.filter(
		a => !!a.checked_in_at || a.checkin_status === "checked_in",
	).length;

	const filteredAttendees = attendees.filter((a: any) => {
		const q = searchQuery.toLowerCase();
		return (
			a.first_name?.toLowerCase().includes(q) ||
			a.last_name?.toLowerCase().includes(q) ||
			a.email?.toLowerCase().includes(q) ||
			a.phone?.includes(q) ||
			a.attendee_id?.includes(q)
		);
	});

	const recentCheckIns = attendees
		.filter((a: any) => !!a.checked_in_at)
		.sort((a: any, b: any) => {
			const dateA = new Date(a.checked_in_at).getTime();
			const dateB = new Date(b.checked_in_at).getTime();
			return dateB - dateA;
		})
		.slice(0, 10);

	const categoryCounts: Record<string, number> = {};
	attendees.forEach(a => {
		const c = (a.category || "Other").toString();
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

		const updated = {
			...selectedAttendee,
			checkin_status: "checked_in",
			checked_in_at: new Date().toISOString(),
		};

		await upsert.mutateAsync(updated);
		setSelectedAttendee(updated);
	};

	const handlePrintBadge = async () => {
		if (!selectedAttendee) return;

		const updated = {
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
						<div className="relative flex-1">
							<Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-400" />
							<input
								type="text"
								placeholder="Search by name, email, phone, or ID..."
								value={searchQuery}
								onChange={e => {
									setSearchQuery(e.target.value);
									setSelectedAttendee(null);
								}}
								className="w-full rounded-md border border-gray-200 bg-white pl-9 pr-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
							/>
						</div>
					</div>

					{searchQuery && filteredAttendees.length > 0 && (
						<div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
							{filteredAttendees.slice(0, 5).map((attendee: any) => {
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
									variant={!!selectedAttendee.checked_in_at ? "green" : "yellow"}
								>
									{!!selectedAttendee.checked_in_at ? "Checked In" : "Not Yet"}
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
									className="flex-1 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
								>
									🖨️ Print Badge
								</button>
							)}
							<button
								onClick={() => setSelectedAttendee(null)}
								className="flex-1 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 transition-colors hover:bg-gray-50"
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
							recentCheckIns.map((attendee: any) => (
								<div
									key={attendee.id}
									className="flex items-center justify-between px-4 py-3"
								>
									<div className="min-w-0 flex-1">
										<p className="truncate text-sm font-medium text-zinc-900">
											{attendee.first_name} {attendee.last_name}
										</p>
										<p className="text-xs text-zinc-500">
											{new Date(attendee.checked_in_at).toLocaleTimeString()}
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
