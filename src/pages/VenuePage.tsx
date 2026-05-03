import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { SectionTitle } from "@/components/SectionTitle";

import { DATA, PAGES_META } from "@/core/data";

export const VenuePage = () => (
	<div>
		<SectionTitle
			title={PAGES_META.find(p => p.id === "venue")?.label || "Venue & Halls"}
			subtitle={PAGES_META.find(p => p.id === "venue")?.description || "Facilities, equipment status, and session assignments"}
		/>
		<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
			{DATA.venues.map((venue, index) => (
				<Card key={index} className="p-4">
					<div className="mb-3 flex items-start justify-between">
						<div>
							<p className="font-semibold text-zinc-900">{venue.name}</p>
							<p className="mt-0.5 text-xs text-zinc-600">
								Capacity: {venue.capacity} seats
							</p>
						</div>
						<Badge variant={venue.status === "Active" ? "green" : "red"}>
							{venue.status}
						</Badge>
					</div>
					<div className="flex flex-wrap gap-2">
						{[
							["Projector", venue.projector],
							["Mic / PA", venue.mic],
							["AC", venue.ac],
						].map(([label, ok], itemIndex) => (
							<span
								key={itemIndex}
								className={`rounded border px-2 py-0.5 text-xs ${ok ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-200 bg-white text-zinc-500 line-through"}`}
							>
								{label}
							</span>
						))}
					</div>
				</Card>
			))}
		</div>
	</div>
);
