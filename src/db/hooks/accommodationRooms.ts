import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type AccommodationRoom = Database["public"]["Tables"]["accommodation_rooms"]["Row"];
type AccommodationRoomInsert = Database["public"]["Tables"]["accommodation_rooms"]["Insert"];
type AccommodationRoomUpdate = Database["public"]["Tables"]["accommodation_rooms"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

export type AccommodationRoomWithRelations = AccommodationRoom & {
	conference_ref: Conference | null;
};

export const ACCOMMODATION_ROOM_SELECT = `
  *,
  conference_ref:conferences(*)
`;

const stripAccommodationRoomRelations = (
	row: Partial<AccommodationRoomWithRelations>,
): Partial<AccommodationRoomUpdate> => {
	const { conference_ref, ...payload } = row;
	return payload;
};

export const useAccommodationRooms = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["accommodation_rooms", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("accommodation_rooms")
				.select(ACCOMMODATION_ROOM_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertAccommodationRoom = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: AccommodationRoomInsert | AccommodationRoomUpdate) => {
			const strippedPayload = stripAccommodationRoomRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("accommodation_rooms")
							.update(payload)
							.eq("id", row.id)
							.select(ACCOMMODATION_ROOM_SELECT)
							.single()
					: await neon
							.from("accommodation_rooms")
							.insert(payload)
							.select(ACCOMMODATION_ROOM_SELECT)
							.single();

			if (error) throw error;

			return data as AccommodationRoomWithRelations;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["accommodation_rooms", conferenceId] }),
	});
};

export const useDeleteAccommodationRoom = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("accommodation_rooms").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["accommodation_rooms", conferenceId] }),
	});
};
