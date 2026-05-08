import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type ConferenceEditor = Database["public"]["Tables"]["conference_editors"]["Row"];
type ConferenceEditorInsert = Database["public"]["Tables"]["conference_editors"]["Insert"];
type ConferenceEditorUpdate = Database["public"]["Tables"]["conference_editors"]["Update"];

export const useConferenceEditors = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["conference_editors", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("conference_editors")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertConferenceEditor = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: ConferenceEditorInsert | ConferenceEditorUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("conference_editors")
							.update(payload as ConferenceEditorUpdate)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon
							.from("conference_editors")
							.insert(payload as ConferenceEditorInsert)
							.select()
							.single();

			if (error) throw error;

			return data as ConferenceEditor;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["conference_editors", conferenceId] }),
	});
};

export const useDeleteConferenceEditor = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("conference_editors").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["conference_editors", conferenceId] }),
	});
};
