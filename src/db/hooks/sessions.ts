import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
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

type SessionRawWithRelations = Session & {
	conference_rel: Conference | null;
	speaker_rel: Speaker | null;
	track_rel: Track | null;
	venue_rel: Venue | null;
};

export type SessionMapped = Omit<Session, "conference" | "speaker" | "track" | "venue"> & {
	conference: Conference | null;
	speaker: Speaker | null;
	track: Track | null;
	venue: Venue | null;
};

export const SESSION_SELECT = `
  *,
  conference_rel:conferences(*),
  speaker_rel:speakers(*),
  track_rel:tracks(*),
  venue_rel:venues(*)
`;

const mapSession = createRelationMapper<SessionRawWithRelations, SessionMapped>({
	conference_rel: "conference",
	speaker_rel: "speaker",
	track_rel: "track",
	venue_rel: "venue",
});

const stripSessionRelations = createRelationStripper<SessionUpdate>([
	"conference_rel",
	"speaker_rel",
	"track_rel",
	"venue_rel",
]);

export const useSessions = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["sessions", conferenceId],
		queryFn: async (): Promise<SessionMapped[]> => {
			const { data, error } = await neon
				.from("sessions")
				.select(SESSION_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return ((data ?? []) as SessionRawWithRelations[]).map(mapSession);
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

			return mapSession(data as SessionRawWithRelations);
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
