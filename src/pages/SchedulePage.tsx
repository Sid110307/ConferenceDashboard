import { useNavigate, useParams } from "react-router";

import { useConferenceDetails } from "@/db/hooks/conferences";
import { useSessions } from "@/db/hooks/sessions";
import type { Database } from "@/db/types";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";

import { PAGES_META } from "@/core/data";
import { formatLabel } from "@/core/display";
import { Routes as AppRoutes } from "@/core/navigation";

type SessionRow = Database["public"]["Tables"]["sessions"]["Row"];

export const SchedulePage = () => {
	const { day: dayParam } = useParams<{ day?: string }>();
	const navigate = useNavigate();
	const { data: conference } = useConferenceDetails();
	const { data: sessions = [] } = useSessions();
	const defaultDay = conference?.current_day || 1;
	const activeDay = dayParam ? parseInt(dayParam, 10) - 1 : defaultDay - 1;

	const typeVariant = (type: string) =>
		({
			Keynote: "blue",
			Workshop: "purple",
			Panel: "orange",
			VIP: "gold",
			Award: "yellow",
			Invited: "green",
			Social: "green",
			Plenary: "blue",
			Poster: "purple",
			Parallel: "gray",
			Break: "gray",
		})[formatLabel(type)] || "gray";

	const daysMap: Record<number, SessionRow[]> = {};
	sessions.forEach((session: SessionRow) => {
		let day = 1;

		try {
			const extraData = session.extra_data;

			if (
				extraData &&
				typeof extraData === "object" &&
				!Array.isArray(extraData) &&
				"day" in extraData
			)
				day = Number(extraData.day) || 1;
			else if (typeof extraData === "string") {
				const parsed = JSON.parse(extraData);

				if (
					parsed &&
					typeof parsed === "object" &&
					!Array.isArray(parsed) &&
					"day" in parsed
				)
					day = Number(parsed.day) || 1;
			}
		} catch {
			console.warn("Failed to parse extra data for session", session);
		}

		if (!daysMap[day]) daysMap[day] = [];
		daysMap[day].push(session);
	});

	const days = Object.keys(daysMap)
		.sort((a, b) => Number(a) - Number(b))
		.map(d => ({ label: `Day ${d}`, sessions: daysMap[Number(d)] }));

	return (
		<div className="flex gap-4 flex-col">
			<SectionTitle
				title={PAGES_META.find(p => p.id === "schedule")?.label || "Schedule"}
				subtitle={
					PAGES_META.find(p => p.id === "schedule")?.description ||
					"Programme across venues and halls"
				}
			/>
			<div className="mb-5 flex flex-wrap gap-2">
				{days.map((day, index) => (
					<button
						key={index}
						onClick={() => navigate(AppRoutes.schedule((index + 1).toString()))}
						className={`rounded-md px-3 py-2 text-sm font-medium transition-all ${activeDay === index ? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100" : "border border-gray-200 bg-white text-zinc-600 hover:border-gray-300 hover:bg-gray-50 hover:text-zinc-900"}`}
					>
						{day.label}
					</button>
				))}
			</div>
			<Card>
				<div className="divide-y divide-gray-100">
					{days[activeDay]?.sessions.map((session, index: number) => (
						<div
							key={index}
							className={`flex flex-col gap-3 px-4 py-4 transition-colors hover:bg-gray-50 sm:flex-row sm:items-center ${session.status === "done" ? "opacity-50" : session.status === "ongoing" ? "border-l-2 border-blue-500" : ""}`}
						>
							<span className="w-28 shrink-0 font-mono text-xs text-zinc-600">
								{session.start_time || session.end_time
									? `${session.start_time?.slice(0, 5) || "??:??"} - ${
											session.end_time?.slice(0, 5) || "??:??"
										}`
									: "Time TBD"}
							</span>
							<div className="min-w-0 flex-1">
								<p className="font-medium text-zinc-900">{session.title}</p>
								<p className="mt-0.5 text-xs text-zinc-600">
									{session.speaker !== "-" && `${session.speaker} · `}
									{session.venue}
								</p>
							</div>
							<div className="flex shrink-0 flex-wrap items-start gap-2">
								<Badge variant={typeVariant(session.session_type || "Other")}>
									{formatLabel(session.session_type || "Other")}
								</Badge>
								{session.status === "ongoing" && <Badge variant="blue">Live</Badge>}
							</div>
						</div>
					))}
				</div>
			</Card>
		</div>
	);
};
