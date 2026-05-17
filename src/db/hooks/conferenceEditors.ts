import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type ConferenceEditor = Database["public"]["Tables"]["conference_editors"]["Row"];
type ConferenceEditorInsert = Database["public"]["Tables"]["conference_editors"]["Insert"];
type ConferenceEditorUpdate = Database["public"]["Tables"]["conference_editors"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

export type ConferenceEditorWithRelations = ConferenceEditor & {
	conference_ref: Conference | null;
};

export const CONFERENCE_EDITOR_SELECT = `
  *,
  conference_ref:conferences(*)
`;

const stripConferenceEditorRelations = (
	row: Partial<ConferenceEditorWithRelations>,
): Partial<ConferenceEditorUpdate> => {
	const { conference_ref, ...payload } = row;
	return payload;
};

export const useConferenceEditors = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["conference_editors", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("conference_editors")
				.select(CONFERENCE_EDITOR_SELECT)
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
			const strippedPayload = stripConferenceEditorRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("conference_editors")
							.update(payload as ConferenceEditorUpdate)
							.eq("id", row.id)
							.select(CONFERENCE_EDITOR_SELECT)
							.single()
					: await neon
							.from("conference_editors")
							.insert(payload as ConferenceEditorInsert)
							.select(CONFERENCE_EDITOR_SELECT)
							.single();

			if (error) throw error;

			return data as ConferenceEditorWithRelations;
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
