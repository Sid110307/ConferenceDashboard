import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Speaker = Database["public"]["Tables"]["speakers"]["Row"];
type SpeakerInsert = Database["public"]["Tables"]["speakers"]["Insert"];
type SpeakerUpdate = Database["public"]["Tables"]["speakers"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

export type SpeakerWithRelations = Speaker & {
	conference_ref: Conference | null;
};

export const SPEAKER_SELECT = `
  *,
  conference_ref:conferences(*)
`;

const stripSpeakerRelations = (row: Partial<SpeakerWithRelations>): Partial<SpeakerUpdate> => {
	const { conference_ref, ...payload } = row;
	return payload;
};

export const useSpeakers = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["speakers", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("speakers")
				.select(SPEAKER_SELECT)
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
			const strippedPayload = stripSpeakerRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("speakers")
							.update(payload)
							.eq("id", row.id)
							.select(SPEAKER_SELECT)
							.single()
					: await neon.from("speakers").insert(payload).select(SPEAKER_SELECT).single();

			if (error) throw error;

			return data as SpeakerWithRelations;
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
