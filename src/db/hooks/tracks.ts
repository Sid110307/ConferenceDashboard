import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Track = Database["public"]["Tables"]["tracks"]["Row"];
type TrackInsert = Database["public"]["Tables"]["tracks"]["Insert"];
type TrackUpdate = Database["public"]["Tables"]["tracks"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

type TrackRawWithRelations = Track & {
	conference_rel: Conference | null;
};

export type TrackMapped = Omit<Track, "conference"> & {
	conference: Conference | null;
};

export const TRACK_SELECT = `
  *,
  conference_rel:conferences(*)
`;

const mapTrack = createRelationMapper<TrackRawWithRelations, TrackMapped>({
	conference_rel: "conference",
});

const stripTrackRelations = createRelationStripper<TrackUpdate>(["conference_rel"]);

export const useTracks = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["tracks", conferenceId],
		queryFn: async (): Promise<TrackMapped[]> => {
			const { data, error } = await neon
				.from("tracks")
				.select(TRACK_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return ((data ?? []) as TrackRawWithRelations[]).map(mapTrack);
		},
	});
};

export const useUpsertTrack = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: TrackInsert | TrackUpdate) => {
			const strippedPayload = stripTrackRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("tracks")
							.update(payload)
							.eq("id", row.id)
							.select(TRACK_SELECT)
							.single()
					: await neon.from("tracks").insert(payload).select(TRACK_SELECT).single();

			if (error) throw error;

			return mapTrack(data as TrackRawWithRelations);
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
