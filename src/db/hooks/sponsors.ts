import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Sponsor = Database["public"]["Tables"]["sponsors"]["Row"];
type SponsorInsert = Database["public"]["Tables"]["sponsors"]["Insert"];
type SponsorUpdate = Database["public"]["Tables"]["sponsors"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

export type SponsorWithRelations = Sponsor & {
	conference_ref: Conference | null;
};

export const SPONSOR_SELECT = `
  *,
  conference_ref:conferences(*)
`;

const stripSponsorRelations = (row: Partial<SponsorWithRelations>): Partial<SponsorUpdate> => {
	const { conference_ref, ...payload } = row;
	return payload;
};

export const useSponsors = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["sponsors", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("sponsors")
				.select(SPONSOR_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertSponsor = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: SponsorInsert | SponsorUpdate) => {
			const strippedPayload = stripSponsorRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("sponsors")
							.update(payload)
							.eq("id", row.id)
							.select(SPONSOR_SELECT)
							.single()
					: await neon.from("sponsors").insert(payload).select(SPONSOR_SELECT).single();

			if (error) throw error;

			return data as SponsorWithRelations;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsors", conferenceId] }),
	});
};

export const useDeleteSponsor = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("sponsors").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["sponsors", conferenceId] }),
	});
};
