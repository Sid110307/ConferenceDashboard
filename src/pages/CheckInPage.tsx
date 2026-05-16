import { useAttendees } from "@/db/hooks/attendees";
import { CheckCircle, Clock, Package, QrCode } from "lucide-react";

import { Card, CardHead } from "@/components/Card";
import { CountUpNumber } from "@/components/CountUpNumber";
import { ProgressBar } from "@/components/ProgressBar";
import { SectionTitle } from "@/components/SectionTitle";
import { StatCard } from "@/components/StatCard";

export const CheckInPage = () => {
	const { data: attendees = [] } = useAttendees();
	const total = attendees.length;
	const checkedIn = attendees.filter(
		a => !!a.checked_in_at || a.checkin_status === "checked_in",
	).length;

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

	return (
		<div>
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
				<StatCard icon={Package} label="Kits Distributed" value={370} color="purple" />
			</div>
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
										<CountUpNumber value={checkedInCount} /> / {category.value}
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
		</div>
	);
};
