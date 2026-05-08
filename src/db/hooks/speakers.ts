import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Speaker = Database["public"]["Tables"]["speakers"]["Row"];
type SpeakerInsert = Database["public"]["Tables"]["speakers"]["Insert"];
type SpeakerUpdate = Database["public"]["Tables"]["speakers"]["Update"];

export const useSpeakers = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["speakers", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("speakers")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertSpeaker = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: SpeakerInsert | SpeakerUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("speakers")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("speakers").insert(payload).select().single();

			if (error) throw error;

			return data as Speaker;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["speakers", conferenceId] }),
	});
};

export const useDeleteSpeaker = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("speakers").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["speakers", conferenceId] }),
	});
};
