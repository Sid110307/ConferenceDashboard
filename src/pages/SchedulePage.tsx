import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";

import { DATA, PAGES_META } from "@/core/data";
import { Routes as AppRoutes } from "@/core/navigation";

export const SchedulePage = () => {
	const { day: dayParam } = useParams<{ day?: string }>();
	const navigate = useNavigate();
	const [activeDay, setActiveDay] = useState(
		dayParam ? parseInt(dayParam) - 1 : DATA.meta.currentDay - 1,
	);

	useEffect(() => {
		if (dayParam) {
			setActiveDay(parseInt(dayParam) - 1);
		}
	}, [dayParam]);

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
		})[type] || "gray";

	return (
		<div>
			<SectionTitle
				title={PAGES_META.find(p => p.id === "schedule")?.label || "Schedule"}
				subtitle={PAGES_META.find(p => p.id === "schedule")?.description || "Programme across venues and halls"}
			/>
			<div className="mb-5 flex gap-2">
				{DATA.schedule.map((day, index) => (
					<button
						key={index}
						onClick={() => navigate(AppRoutes.schedule((index + 1).toString()))}
						className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
							activeDay === index
								? "bg-blue-600 text-white"
								: "bg-white text-zinc-600 hover:bg-gray-50 hover:text-zinc-900 border border-gray-200"
						}`}
					>
						{day.label}
					</button>
				))}
			</div>
			<Card>
				<div className="divide-y divide-gray-200">
					{DATA.schedule[activeDay].sessions.map((session, index) => (
						<div
							key={index}
							className={`flex gap-4 px-5 py-4 transition-colors hover:bg-gray-50 ${
								session.status === "done"
									? "opacity-50"
									: session.status === "ongoing"
										? "border-l-2 border-blue-400"
										: ""
							}`}
						>
							<span className="mt-0.5 w-28 shrink-0 font-mono text-xs text-zinc-600">
								{session.time}
							</span>
							<div className="min-w-0 flex-1">
								<p className="font-medium text-zinc-900">{session.title}</p>
								<p className="mt-0.5 text-xs text-zinc-600">
									{session.speaker !== "-" && `${session.speaker} · `}
									{session.venue}
								</p>
							</div>
							<div className="flex shrink-0 items-start gap-2">
								<Badge variant={typeVariant(session.type)}>{session.type}</Badge>
								{session.status === "ongoing" && <Badge variant="blue">Live</Badge>}
							</div>
						</div>
					))}
				</div>
			</Card>
		</div>
	);
};
