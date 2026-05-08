import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Sponsor = Database["public"]["Tables"]["sponsors"]["Row"];
type SponsorInsert = Database["public"]["Tables"]["sponsors"]["Insert"];
type SponsorUpdate = Database["public"]["Tables"]["sponsors"]["Update"];

export const useSponsors = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["sponsors", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("sponsors")
				.select("*")
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
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("sponsors")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("sponsors").insert(payload).select().single();

			if (error) throw error;

			return data as Sponsor;
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
