import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Volunteer = Database["public"]["Tables"]["volunteers"]["Row"];
type VolunteerInsert = Database["public"]["Tables"]["volunteers"]["Insert"];
type VolunteerUpdate = Database["public"]["Tables"]["volunteers"]["Update"];

export const useVolunteers = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["volunteers", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("volunteers")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertVolunteer = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: VolunteerInsert | VolunteerUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("volunteers")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("volunteers").insert(payload).select().single();

			if (error) throw error;

			return data as Volunteer;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["volunteers", conferenceId] }),
	});
};

export const useDeleteVolunteer = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("volunteers").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["volunteers", conferenceId] }),
	});
};
