import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type NavigationItem = Database["public"]["Tables"]["navigation_items"]["Row"];
type NavigationItemInsert = Database["public"]["Tables"]["navigation_items"]["Insert"];
type NavigationItemUpdate = Database["public"]["Tables"]["navigation_items"]["Update"];

export const useNavigationItems = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["navigation_items", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("navigation_items")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertNavigationItem = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: NavigationItemInsert | NavigationItemUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("navigation_items")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("navigation_items").insert(payload).select().single();

			if (error) throw error;

			return data as NavigationItem;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["navigation_items", conferenceId] }),
	});
};

export const useDeleteNavigationItem = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("navigation_items").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["navigation_items", conferenceId] }),
	});
};
