import { useState } from "react";

import { useDeleteVenue, useUpsertVenue, useVenues } from "@/db/hooks/venues";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import EntityDrawer from "@/components/EntityDrawer";
import { SectionTitle } from "@/components/SectionTitle";

import { useConference } from "@/core/ConferenceContext";
import { PAGES_META } from "@/core/data";

export const VenuePage = () => {
	const { data: venues = [], isLoading } = useVenues();
	const _conf = useConference();
	const isEditor = _conf?.isEditor || false;
	const upsert = useUpsertVenue();
	const remove = useDeleteVenue();
	const [editing, setEditing] = useState<Record<string, any> | null>(null);

	return (
		<div>
			<SectionTitle
				title={PAGES_META.find(p => p.id === "venue")?.label || "Venue & Halls"}
				subtitle={
					isLoading
						? "Loading venues..."
						: PAGES_META.find(p => p.id === "venue")?.description ||
							"Facilities, equipment status, and session assignments"
				}
			/>
			<div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
				{isLoading ? (
					<div className="col-span-full p-4 text-sm text-zinc-500">Loading...</div>
				) : (
					venues.map((venue: any, index: number) => (
						<Card key={index} className="p-4">
							<div className="mb-3 flex items-start justify-between">
								<div>
									<p className="font-semibold text-zinc-900">{venue.name}</p>
									<p className="mt-0.5 text-xs text-zinc-600">
										Capacity: {venue.capacity} seats
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Badge variant={venue.status === "Active" ? "green" : "red"}>
										{venue.status}
									</Badge>
									{isEditor && (
										<div className="flex gap-1">
											<button
												className="rounded-md px-2 py-1 text-xs border border-gray-100"
												onClick={() => setEditing(venue)}
											>
												Edit
											</button>
											<button
												className="rounded-md px-2 py-1 text-xs border border-red-200 text-red-600"
												onClick={() => remove.mutate(venue.id)}
											>
												Delete
											</button>
										</div>
									)}
								</div>
							</div>
							<div className="flex flex-wrap gap-2">
								{[
									["Projector", venue.projector],
									["Mic / PA", venue.mic],
									["AC", venue.ac],
								].map(([label, ok], itemIndex) => (
									<span
										key={itemIndex}
										className={`rounded-md border px-2 py-0.5 text-xs ${ok ? "border-blue-200 bg-blue-50 text-blue-700" : "border-gray-100 bg-white text-zinc-500 line-through"}`}
									>
										{label}
									</span>
								))}
							</div>
						</Card>
					))
				)}
			</div>
			{editing !== null && (
				<EntityDrawer
					open={editing !== null}
					title={editing?.id ? "Edit venue" : "Add venue"}
					initial={editing}
					fields={[
						{ name: "name", label: "Name" },
						{ name: "capacity", label: "Capacity", type: "number" },
						{
							name: "status",
							label: "Status",
							type: "select",
							options: ["Active", "Inactive"],
						},
						{
							name: "projector",
							label: "Projector",
							type: "select",
							options: ["true", "false"],
						},
						{
							name: "mic",
							label: "Mic / PA",
							type: "select",
							options: ["true", "false"],
						},
						{ name: "ac", label: "AC", type: "select", options: ["true", "false"] },
					]}
					onCancel={() => setEditing(null)}
					onSave={async row => {
						await upsert.mutateAsync(row);
						setEditing(null);
					}}
					onDelete={
						editing?.id
							? async () => {
									await remove.mutateAsync(editing.id);
									setEditing(null);
								}
							: undefined
					}
				/>
			)}
		</div>
	);
};
