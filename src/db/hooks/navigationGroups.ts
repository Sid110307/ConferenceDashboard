import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type NavigationGroup = Database["public"]["Tables"]["navigation_groups"]["Row"];
type NavigationGroupInsert = Database["public"]["Tables"]["navigation_groups"]["Insert"];
type NavigationGroupUpdate = Database["public"]["Tables"]["navigation_groups"]["Update"];

export const useNavigationGroups = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["navigation_groups", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("navigation_groups")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertNavigationGroup = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: NavigationGroupInsert | NavigationGroupUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("navigation_groups")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("navigation_groups").insert(payload).select().single();

			if (error) throw error;

			return data as NavigationGroup;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["navigation_groups", conferenceId] }),
	});
};

export const useDeleteNavigationGroup = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("navigation_groups").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["navigation_groups", conferenceId] }),
	});
};
