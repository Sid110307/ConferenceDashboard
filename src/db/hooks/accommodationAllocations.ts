import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type AccommodationAllocation = Database["public"]["Tables"]["accommodation_allocations"]["Row"];
type AccommodationAllocationInsert =
	Database["public"]["Tables"]["accommodation_allocations"]["Insert"];
type AccommodationAllocationUpdate =
	Database["public"]["Tables"]["accommodation_allocations"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type Attendee = Database["public"]["Tables"]["attendees"]["Row"];
type AccommodationRoom = Database["public"]["Tables"]["accommodation_rooms"]["Row"];

type AccommodationAllocationRawWithRelations = AccommodationAllocation & {
	conference_rel: Conference | null;
	attendee_rel: Attendee | null;
	room_rel: AccommodationRoom | null;
};

export type AccommodationAllocationMapped = Omit<
	AccommodationAllocation,
	"conference" | "attendee" | "room"
> & {
	conference: Conference | null;
	attendee: Attendee | null;
	room: AccommodationRoom | null;
};

export const ACCOMMODATION_ALLOCATION_SELECT = `
  *,
  conference_rel:conferences(*),
  attendee_rel:attendees(*),
  room_rel:accommodation_rooms(*)
`;

const mapAccommodationAllocation = createRelationMapper<
	AccommodationAllocationRawWithRelations,
	AccommodationAllocationMapped
>({
	conference_rel: "conference",
	attendee_rel: "attendee",
	room_rel: "room",
});

const stripAccommodationAllocationRelations = createRelationStripper<AccommodationAllocationUpdate>(
	["conference_rel", "attendee_rel", "room_rel"],
);

export const useAccommodationAllocations = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["accommodation_allocations", conferenceId],
		queryFn: async (): Promise<AccommodationAllocationMapped[]> => {
			const { data, error } = await neon
				.from("accommodation_allocations")
				.select(ACCOMMODATION_ALLOCATION_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return ((data ?? []) as AccommodationAllocationRawWithRelations[]).map(
				mapAccommodationAllocation,
			);
		},
	});
};

export const useUpsertAccommodationAllocation = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: AccommodationAllocationInsert | AccommodationAllocationUpdate) => {
			const strippedPayload = stripAccommodationAllocationRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("accommodation_allocations")
							.update(payload)
							.eq("id", row.id)
							.select(ACCOMMODATION_ALLOCATION_SELECT)
							.single()
					: await neon
							.from("accommodation_allocations")
							.insert(payload)
							.select(ACCOMMODATION_ALLOCATION_SELECT)
							.single();

			if (error) throw error;

			return mapAccommodationAllocation(data as AccommodationAllocationRawWithRelations);
		},
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["accommodation_allocations", conferenceId] }),
	});
};

export const useDeleteAccommodationAllocation = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("accommodation_allocations").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["accommodation_allocations", conferenceId] }),
	});
};
