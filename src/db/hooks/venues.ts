import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Venue = Database["public"]["Tables"]["venues"]["Row"];
type VenueInsert = Database["public"]["Tables"]["venues"]["Insert"];
type VenueUpdate = Database["public"]["Tables"]["venues"]["Update"];

export const useVenues = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["venues", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("venues")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertVenue = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: VenueInsert | VenueUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("venues")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("venues").insert(payload).select().single();

			if (error) throw error;

			return data as Venue;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["venues", conferenceId] }),
	});
};

export const useDeleteVenue = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("venues").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["venues", conferenceId] }),
	});
};
