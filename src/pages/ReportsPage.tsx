import {
	Bed,
	CheckCircle,
	Crown,
	Download,
	MessageSquare,
	Plane,
	Receipt,
	Star,
	TrendingUp,
	Users,
	Utensils,
} from "lucide-react";

import { Badge } from "@/components/Badge";
import { SectionTitle } from "@/components/SectionTitle";
import { PAGES_META } from "@/core/data";

export const ReportsPage = () => {
	const reports = [
		{
			name: "Full Attendee List",
			desc: "All 500 participants with complete details",
			icon: Users,
			format: "Excel / CSV",
		},
		{
			name: "State-wise Participants",
			desc: "Breakdown by state and institution",
			icon: TrendingUp,
			format: "Excel / PDF",
		},
		{
			name: "VIP Guest List",
			desc: "Detailed VIP profile and protocol information",
			icon: Crown,
			format: "PDF",
		},
		{
			name: "Accommodation List",
			desc: "Room assignments and occupancy report",
			icon: Bed,
			format: "Excel",
		},
		{
			name: "Food Count (Day-wise)",
			desc: "Meal requirements and dietary breakdown",
			icon: Utensils,
			format: "Excel",
		},
		{
			name: "Transport Pickup List",
			desc: "All arrivals, pickups, and vehicle assignments",
			icon: Plane,
			format: "Excel / PDF",
		},
		{
			name: "Certificate Eligibility",
			desc: "Participants eligible for certificate generation",
			icon: Star,
			format: "Excel",
		},
		{
			name: "Day-wise Attendance",
			desc: "Check-in and attendance summary per day",
			icon: CheckCircle,
			format: "PDF",
		},
		{
			name: "Finance Summary",
			desc: "Budget vs actual with vendor payments",
			icon: Receipt,
			format: "Excel / PDF",
		},
		{
			name: "Feedback Report",
			desc: "Aggregated session and overall event feedback",
			icon: MessageSquare,
			format: "PDF",
		},
	];

	return (
		<div>
			<SectionTitle
				title={PAGES_META.find(p => p.id === "reports")?.label || "Reports & Data Export"}
				subtitle={PAGES_META.find(p => p.id === "reports")?.description || "Generate and download event reports in Excel, PDF, or CSV"}
			/>
			<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
yt				{reports.map((report, index) => (
					<button
						key={index}
						type="button"
						aria-label={`Open report ${report.name}`}
						className="group flex w-full cursor-pointer items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 transition-colors hover:border-blue-200"
					>
						<div className="shrink-0 rounded-lg bg-blue-50 p-2.5 text-blue-600">
							<report.icon size={18} aria-hidden />
						</div>
						<div className="min-w-0 flex-1">
							<p className="font-medium text-zinc-900">{report.name}</p>
							<p className="mt-0.5 text-xs text-zinc-600">{report.desc}</p>
						</div>
						<div className="flex shrink-0 items-center gap-2">
							<Badge variant="gray">{report.format}</Badge>
							<Download
								size={14}
								className="text-zinc-600 transition-colors group-hover:text-blue-600"
								aria-hidden
							/>
						</div>
					</button>
				))}
			</div>
		</div>
	);
};
