import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Venue = Database["public"]["Tables"]["venues"]["Row"];
type VenueInsert = Database["public"]["Tables"]["venues"]["Insert"];
type VenueUpdate = Database["public"]["Tables"]["venues"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

type VenueRawWithRelations = Venue & {
	conference_rel: Conference | null;
};

export type VenueMapped = Omit<Venue, "conference"> & {
	conference: Conference | null;
};

export const VENUE_SELECT = `
  *,
  conference_rel:conferences(*)
`;

const mapVenue = createRelationMapper<VenueRawWithRelations, VenueMapped>({
	conference_rel: "conference",
});

const stripVenueRelations = createRelationStripper<VenueUpdate>(["conference_rel"]);

export const useVenues = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["venues", conferenceId],
		queryFn: async (): Promise<VenueMapped[]> => {
			const { data, error } = await neon
				.from("venues")
				.select(VENUE_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return ((data ?? []) as VenueRawWithRelations[]).map(mapVenue);
		},
	});
};

export const useUpsertVenue = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: VenueInsert | VenueUpdate) => {
			const strippedPayload = stripVenueRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("venues")
							.update(payload)
							.eq("id", row.id)
							.select(VENUE_SELECT)
							.single()
					: await neon.from("venues").insert(payload).select(VENUE_SELECT).single();

			if (error) throw error;

			return mapVenue(data as VenueRawWithRelations);
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
