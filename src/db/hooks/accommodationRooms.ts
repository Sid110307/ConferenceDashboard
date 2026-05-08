import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type AccommodationRoom = Database["public"]["Tables"]["accommodation_rooms"]["Row"];
type AccommodationRoomInsert = Database["public"]["Tables"]["accommodation_rooms"]["Insert"];
type AccommodationRoomUpdate = Database["public"]["Tables"]["accommodation_rooms"]["Update"];

export const useAccommodationRooms = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["accommodation_rooms", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("accommodation_rooms")
				.select("*")
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
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("accommodation_rooms")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("accommodation_rooms").insert(payload).select().single();

			if (error) throw error;

			return data as AccommodationRoom;
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
