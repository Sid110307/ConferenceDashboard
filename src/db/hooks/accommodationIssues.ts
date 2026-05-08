import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type AccommodationIssue = Database["public"]["Tables"]["accommodation_issues"]["Row"];
type AccommodationIssueInsert = Database["public"]["Tables"]["accommodation_issues"]["Insert"];
type AccommodationIssueUpdate = Database["public"]["Tables"]["accommodation_issues"]["Update"];

export const useAccommodationIssues = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["accommodation_issues", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("accommodation_issues")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertAccommodationIssue = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: AccommodationIssueInsert | AccommodationIssueUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("accommodation_issues")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("accommodation_issues").insert(payload).select().single();

			if (error) throw error;

			return data as AccommodationIssue;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["accommodation_issues", conferenceId] }),
	});
};

export const useDeleteAccommodationIssue = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("accommodation_issues").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["accommodation_issues", conferenceId] }),
	});
};
