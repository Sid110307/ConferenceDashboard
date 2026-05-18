import { useState } from "react";

import { useDeleteVenue, useUpsertVenue, useVenues, type VenueMapped } from "@/db/hooks/venues";
import type { Database } from "@/db/types.ts";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import EntityDrawer from "@/components/EntityDrawer";
import { SectionTitle } from "@/components/SectionTitle";
import { tableActionButtonClassName, tableDangerButtonClassName } from "@/components/uiStyles";

import { useConference } from "@/core/ConferenceContext";
import { PAGES_META } from "@/core/data";
import { formatLabel } from "@/core/display";

type VenueUpdate = Database["public"]["Tables"]["venues"]["Update"];

export const VenuePage = () => {
	const { data: venues = [], isLoading } = useVenues();
	const { conferenceId } = useConference();
	const isEditor = useConference()?.isEditor || false;
	const upsert = useUpsertVenue();
	const remove = useDeleteVenue();
	const [editing, setEditing] = useState<VenueMapped | null>(null);

	return (
		<div className="flex gap-4 flex-col">
			<SectionTitle
				title={PAGES_META.find(p => p.id === "venue")?.label || "Venue and Halls"}
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
					venues.map((venue, index: number) => (
						<Card key={index} className="p-4">
							<div className="mb-3 flex items-start justify-between">
								<div>
									<p className="font-semibold text-zinc-900">{venue.name}</p>
									<p className="mt-0.5 text-xs text-zinc-600">
										Capacity: {venue.capacity} seats
									</p>
								</div>
								<div className="flex items-center gap-2">
									<Badge
										variant={
											formatLabel(venue.status_label) === "Active"
												? "green"
												: "red"
										}
									>
										{formatLabel(venue.status_label)}
									</Badge>
									{isEditor && (
										<div className="flex gap-1">
											<button
												className={tableActionButtonClassName}
												onClick={() => {
													setEditing(venue);
												}}
											>
												Edit
											</button>
											<button
												className={tableDangerButtonClassName}
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
									["Projector", venue.has_projector],
									["Mic / PA", venue.has_mic],
									["AC", venue.has_ac],
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
						await upsert.mutateAsync(row as VenueUpdate);
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
