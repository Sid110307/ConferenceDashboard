import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Session = Database["public"]["Tables"]["sessions"]["Row"];
type SessionInsert = Database["public"]["Tables"]["sessions"]["Insert"];
type SessionUpdate = Database["public"]["Tables"]["sessions"]["Update"];

export const useSessions = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["sessions", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("sessions")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertSession = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: SessionInsert | SessionUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("sessions")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("sessions").insert(payload).select().single();

			if (error) throw error;

			return data as Session;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions", conferenceId] }),
	});
};

export const useDeleteSession = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("sessions").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["sessions", conferenceId] }),
	});
};
