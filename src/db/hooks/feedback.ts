import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Feedback = Database["public"]["Tables"]["feedback"]["Row"];
type FeedbackInsert = Database["public"]["Tables"]["feedback"]["Insert"];
type FeedbackUpdate = Database["public"]["Tables"]["feedback"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type Session = Database["public"]["Tables"]["sessions"]["Row"];
type Attendee = Database["public"]["Tables"]["attendees"]["Row"];

type FeedbackRawWithRelations = Feedback & {
	conference_rel: Conference | null;
	session_rel: Session | null;
	attendee_rel: Attendee | null;
};

export type FeedbackMapped = Omit<Feedback, "conference" | "session" | "attendee"> & {
	conference: Conference | null;
	session: Session | null;
	attendee: Attendee | null;
};

export const FEEDBACK_SELECT = `
  *,
  conference_rel:conferences(*),
  session_rel:sessions(*),
  attendee_rel:attendees(*)
`;

const mapFeedback = createRelationMapper<FeedbackRawWithRelations, FeedbackMapped>({
	conference_rel: "conference",
	session_rel: "session",
	attendee_rel: "attendee",
});

const stripFeedbackRelations = createRelationStripper<FeedbackUpdate>([
	"conference_rel",
	"session_rel",
	"attendee_rel",
]);

export const useFeedback = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["feedback", conferenceId],
		queryFn: async (): Promise<FeedbackMapped[]> => {
			const { data, error } = await neon
				.from("feedback")
				.select(FEEDBACK_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return ((data ?? []) as FeedbackRawWithRelations[]).map(mapFeedback);
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

			return mapFeedback(data as FeedbackRawWithRelations);
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
