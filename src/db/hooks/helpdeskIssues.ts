import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type HelpdeskIssue = Database["public"]["Tables"]["helpdesk_issues"]["Row"];
type HelpdeskIssueInsert = Database["public"]["Tables"]["helpdesk_issues"]["Insert"];
type HelpdeskIssueUpdate = Database["public"]["Tables"]["helpdesk_issues"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type Attendee = Database["public"]["Tables"]["attendees"]["Row"];

export type HelpdeskIssueWithRelations = HelpdeskIssue & {
	conference_ref: Conference | null;
	attendee_ref: Attendee | null;
};

export const HELPDESK_ISSUE_SELECT = `
  *,
  conference_ref:conferences(*),
  attendee_ref:attendees(*)
`;

const stripHelpdeskIssueRelations = (
	row: Partial<HelpdeskIssueWithRelations>,
): Partial<HelpdeskIssueUpdate> => {
	const { conference_ref, attendee_ref, ...payload } = row;
	return payload;
};

export const useHelpdeskIssues = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["helpdesk_issues", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("helpdesk_issues")
				.select(HELPDESK_ISSUE_SELECT)
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
			const strippedPayload = stripHelpdeskIssueRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("helpdesk_issues")
							.update(payload)
							.eq("id", row.id)
							.select(HELPDESK_ISSUE_SELECT)
							.single()
					: await neon
							.from("helpdesk_issues")
							.insert(payload)
							.select(HELPDESK_ISSUE_SELECT)
							.single();

			if (error) throw error;

			return data as HelpdeskIssueWithRelations;
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
