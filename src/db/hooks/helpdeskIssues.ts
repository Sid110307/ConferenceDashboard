import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type HelpdeskIssue = Database["public"]["Tables"]["helpdesk_issues"]["Row"];
type HelpdeskIssueInsert = Database["public"]["Tables"]["helpdesk_issues"]["Insert"];
type HelpdeskIssueUpdate = Database["public"]["Tables"]["helpdesk_issues"]["Update"];

export const useHelpdeskIssues = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["helpdesk_issues", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("helpdesk_issues")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertHelpdeskIssue = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: HelpdeskIssueInsert | HelpdeskIssueUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("helpdesk_issues")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("helpdesk_issues").insert(payload).select().single();

			if (error) throw error;

			return data as HelpdeskIssue;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["helpdesk_issues", conferenceId] }),
	});
};

export const useDeleteHelpdeskIssue = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("helpdesk_issues").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["helpdesk_issues", conferenceId] }),
	});
};
