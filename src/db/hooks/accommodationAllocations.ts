import { neon } from "@/db/neon";
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

export type AccommodationAllocationWithRelations = AccommodationAllocation & {
	conference_ref: Conference | null;
	attendee_ref: Attendee | null;
	room_ref: AccommodationRoom | null;
};

export const ACCOMMODATION_ALLOCATION_SELECT = `
  *,
  conference_ref:conferences(*),
  attendee_ref:attendees(*),
  room_ref:accommodation_rooms(*)
`;

const stripAccommodationAllocationRelations = (
	row: Partial<AccommodationAllocationWithRelations>,
): Partial<AccommodationAllocationUpdate> => {
	const { conference_ref, attendee_ref, room_ref, ...payload } = row;
	return payload;
};

export const useAccommodationAllocations = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["accommodation_allocations", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("accommodation_allocations")
				.select(ACCOMMODATION_ALLOCATION_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
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

			return data as AccommodationAllocationWithRelations;
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
