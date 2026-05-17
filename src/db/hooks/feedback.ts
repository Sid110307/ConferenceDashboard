import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Feedback = Database["public"]["Tables"]["feedback"]["Row"];
type FeedbackInsert = Database["public"]["Tables"]["feedback"]["Insert"];
type FeedbackUpdate = Database["public"]["Tables"]["feedback"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type Session = Database["public"]["Tables"]["sessions"]["Row"];
type Attendee = Database["public"]["Tables"]["attendees"]["Row"];

export type FeedbackWithRelations = Feedback & {
	conference_ref: Conference | null;
	session_ref: Session | null;
	attendee_ref: Attendee | null;
};

export const FEEDBACK_SELECT = `
  *,
  conference_ref:conferences(*),
  session_ref:sessions(*),
  attendee_ref:attendees(*)
`;

const stripFeedbackRelations = (row: Partial<FeedbackWithRelations>): Partial<FeedbackUpdate> => {
	const { conference_ref, session_ref, attendee_ref, ...payload } = row;
	return payload;
};

export const useFeedback = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["feedback", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("feedback")
				.select(FEEDBACK_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertFeedback = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: FeedbackInsert | FeedbackUpdate) => {
			const strippedPayload = stripFeedbackRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("feedback")
							.update(payload)
							.eq("id", row.id)
							.select(FEEDBACK_SELECT)
							.single()
					: await neon.from("feedback").insert(payload).select(FEEDBACK_SELECT).single();

			if (error) throw error;

			return data as FeedbackWithRelations;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback", conferenceId] }),
	});
};

export const useDeleteFeedback = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("feedback").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["feedback", conferenceId] }),
	});
};
