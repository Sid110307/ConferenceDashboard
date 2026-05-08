import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Feedback = Database["public"]["Tables"]["feedback"]["Row"];
type FeedbackInsert = Database["public"]["Tables"]["feedback"]["Insert"];
type FeedbackUpdate = Database["public"]["Tables"]["feedback"]["Update"];

export const useFeedback = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["feedback", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("feedback")
				.select("*")
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
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("feedback")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("feedback").insert(payload).select().single();

			if (error) throw error;

			return data as Feedback;
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
