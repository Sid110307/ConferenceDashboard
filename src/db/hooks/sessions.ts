import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Session = Database["public"]["Tables"]["sessions"]["Row"];
type SessionInsert = Database["public"]["Tables"]["sessions"]["Insert"];
type SessionUpdate = Database["public"]["Tables"]["sessions"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type Speaker = Database["public"]["Tables"]["speakers"]["Row"];
type Track = Database["public"]["Tables"]["tracks"]["Row"];
type Venue = Database["public"]["Tables"]["venues"]["Row"];

export type SessionWithRelations = Session & {
	conference_ref: Conference | null;
	speaker_ref: Speaker | null;
	track_ref: Track | null;
	venue_ref: Venue | null;
};

export const SESSION_SELECT = `
  *,
  conference_ref:conferences(*),
  speaker_ref:speakers(*),
  track_ref:tracks(*),
  venue_ref:venues(*)
`;

const stripSessionRelations = (row: Partial<SessionWithRelations>): Partial<SessionUpdate> => {
	const { conference_ref, speaker_ref, track_ref, venue_ref, ...payload } = row;
	return payload;
};

export const useSessions = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["sessions", conferenceId],
		queryFn: async (): Promise<SessionWithRelations[]> => {
			const { data, error } = await neon
				.from("sessions")
				.select(SESSION_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return (data ?? []) as SessionWithRelations[];
		},
	});
};

export const useUpsertSession = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: SessionInsert | SessionUpdate) => {
			const strippedPayload = stripSessionRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("sessions")
							.update(payload)
							.eq("id", row.id)
							.select(SESSION_SELECT)
							.single()
					: await neon.from("sessions").insert(payload).select(SESSION_SELECT).single();

			if (error) throw error;

			return data as SessionWithRelations;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions", conferenceId] }),
	});
};

export const useDeleteSession = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("sessions").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions", conferenceId] }),
	});
};
