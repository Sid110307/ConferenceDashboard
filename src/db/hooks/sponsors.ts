import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Sponsor = Database["public"]["Tables"]["sponsors"]["Row"];
type SponsorInsert = Database["public"]["Tables"]["sponsors"]["Insert"];
type SponsorUpdate = Database["public"]["Tables"]["sponsors"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

type SponsorRawWithRelations = Sponsor & {
	conference_rel: Conference | null;
};

export type SponsorMapped = Omit<Sponsor, "conference"> & {
	conference: Conference | null;
};

export const SPONSOR_SELECT = `
  *,
  conference_rel:conferences(*)
`;

const mapSponsor = createRelationMapper<SponsorRawWithRelations, SponsorMapped>({
	conference_rel: "conference",
});

const stripSponsorRelations = createRelationStripper<SponsorUpdate>(["conference_rel"]);

export const useSponsors = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["sponsors", conferenceId],
		queryFn: async (): Promise<SponsorMapped[]> => {
			const { data, error } = await neon
				.from("sponsors")
				.select(SPONSOR_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return ((data ?? []) as SponsorRawWithRelations[]).map(mapSponsor);
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

			return mapSponsor(data as SponsorRawWithRelations);
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
