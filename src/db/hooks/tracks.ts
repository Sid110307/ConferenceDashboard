import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Track = Database["public"]["Tables"]["tracks"]["Row"];
type TrackInsert = Database["public"]["Tables"]["tracks"]["Insert"];
type TrackUpdate = Database["public"]["Tables"]["tracks"]["Update"];

export const useTracks = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["tracks", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("tracks")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertTrack = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: TrackInsert | TrackUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("tracks")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("tracks").insert(payload).select().single();

			if (error) throw error;

			return data as Track;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["tracks", conferenceId] }),
	});
};

export const useDeleteTrack = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("tracks").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["tracks", conferenceId] }),
	});
};
