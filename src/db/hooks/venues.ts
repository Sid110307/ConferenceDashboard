import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Venue = Database["public"]["Tables"]["venues"]["Row"];
type VenueInsert = Database["public"]["Tables"]["venues"]["Insert"];
type VenueUpdate = Database["public"]["Tables"]["venues"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

export type VenueWithRelations = Venue & {
	conference_ref: Conference | null;
};

export const VENUE_SELECT = `
  *,
  conference_ref:conferences(*)
`;

const stripVenueRelations = (row: Partial<VenueWithRelations>): Partial<VenueUpdate> => {
	const { conference_ref, ...payload } = row;
	return payload;
};

export const useVenues = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["venues", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("venues")
				.select(VENUE_SELECT)
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

			return data as VenueWithRelations;
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
