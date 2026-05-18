import { useState } from "react";

import {
	Bed,
	CheckCircle,
	Clock,
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
import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";

import { PAGES_META } from "@/core/data";

export const ReportsPage = () => {
	const [lastGenerated, setLastGenerated] = useState<Record<string, string | null>>({});

	const reports = [
		{
			id: "attendee-list",
			name: "Full Attendee List",
			desc: "All 500 participants with complete details",
			icon: Users,
			formats: ["Excel", "CSV"],
		},
		{
			id: "state-breakdown",
			name: "State-wise Participants",
			desc: "Breakdown by state and institution",
			icon: TrendingUp,
			formats: ["Excel", "PDF"],
		},
		{
			id: "vip-list",
			name: "VIP Guest List",
			desc: "Detailed VIP profile and protocol information",
			icon: Crown,
			formats: ["PDF"],
		},
		{
			id: "accommodation",
			name: "Accommodation List",
			desc: "Room assignments and occupancy report",
			icon: Bed,
			formats: ["Excel"],
		},
		{
			id: "food-count",
			name: "Food Count (Day-wise)",
			desc: "Meal requirements and dietary breakdown",
			icon: Utensils,
			formats: ["Excel"],
		},
		{
			id: "transport",
			name: "Transport Pickup List",
			desc: "All arrivals, pickups, and vehicle assignments",
			icon: Plane,
			formats: ["Excel", "PDF"],
		},
		{
			id: "certificates",
			name: "Certificate Eligibility",
			desc: "Participants eligible for certificate generation",
			icon: Star,
			formats: ["Excel"],
		},
		{
			id: "attendance",
			name: "Day-wise Attendance",
			desc: "Check-in and attendance summary per day",
			icon: CheckCircle,
			formats: ["PDF"],
		},
		{
			id: "finance",
			name: "Finance Summary",
			desc: "Budget vs actual with vendor payments",
			icon: Receipt,
			formats: ["Excel", "PDF"],
		},
		{
			id: "feedback",
			name: "Feedback Report",
			desc: "Aggregated session and overall event feedback",
			icon: MessageSquare,
			formats: ["PDF"],
		},
	];

	const handleGenerateReport = (reportId: string) => {
		setLastGenerated(prev => ({
			...prev,
			[reportId]: new Date().toLocaleString(),
		}));

		console.log(`Generating ${reportId} report...`);
		// TODO: Implement
	};

	const getLastGeneratedTime = (reportId: string) => {
		const timestamp = lastGenerated[reportId];
		if (!timestamp) return null;
		const date = new Date(timestamp);
		const now = new Date();
		const diffMinutes = Math.floor((now.getTime() - date.getTime()) / 60000);
		if (diffMinutes < 1) return "Just now";
		if (diffMinutes < 60) return `${diffMinutes}m ago`;
		const diffHours = Math.floor(diffMinutes / 60);
		if (diffHours < 24) return `${diffHours}h ago`;
		return date.toLocaleDateString();
	};

	return (
		<div className="flex gap-4 flex-col">
			<SectionTitle
				title={PAGES_META.find(p => p.id === "reports")?.label || "Reports & Data Export"}
				subtitle={
					PAGES_META.find(p => p.id === "reports")?.description ||
					"Generate and download event reports in Excel, PDF, or CSV"
				}
			/>
			<Card className="mb-4 bg-blue-50 border-blue-200">
				<div className="flex items-center gap-3 p-4">
					<Clock size={20} className="text-blue-600" />
					<div>
						<p className="font-semibold text-blue-900">Report Generation</p>
						<p className="text-xs text-blue-700">
							Click any report below to generate it. Reports show last generated
							timestamp.
						</p>
					</div>
				</div>
			</Card>
			<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
				{reports.map(report => {
					const lastGenTime = getLastGeneratedTime(report.id);
					return (
						<button
							key={report.id}
							type="button"
							onClick={() => handleGenerateReport(report.id)}
							aria-label={`Generate report ${report.name}`}
							className="group flex w-full items-center gap-4 rounded-lg border border-gray-100 bg-white p-4 transition-all hover:border-blue-200 hover:shadow-md"
						>
							<div className="shrink-0 rounded-md bg-blue-50 p-2.5 text-blue-600 group-hover:bg-blue-100">
								<report.icon size={18} aria-hidden />
							</div>
							<div className="min-w-0 flex-1 text-left">
								<p className="font-medium text-zinc-900">{report.name}</p>
								<p className="mt-0.5 text-xs text-zinc-600">{report.desc}</p>
								{lastGenTime && (
									<p className="mt-1 text-xs text-green-600">
										✓ Generated {lastGenTime}
									</p>
								)}
							</div>
							<div className="flex shrink-0 flex-col items-end gap-2">
								<div className="flex gap-1.5">
									{report.formats.map(format => (
										<Badge key={format} variant="gray">
											{format}
										</Badge>
									))}
								</div>
								<Download
									size={16}
									className="text-zinc-600 transition-colors group-hover:text-blue-600"
									aria-hidden
								/>
							</div>
						</button>
					);
				})}
			</div>
		</div>
	);
};
