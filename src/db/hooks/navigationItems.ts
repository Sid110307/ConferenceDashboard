import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type NavigationItem = Database["public"]["Tables"]["navigation_items"]["Row"];
type NavigationItemInsert = Database["public"]["Tables"]["navigation_items"]["Insert"];
type NavigationItemUpdate = Database["public"]["Tables"]["navigation_items"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type NavigationGroup = Database["public"]["Tables"]["navigation_groups"]["Row"];

export type NavigationItemWithRelations = NavigationItem & {
	conference_ref: Conference | null;
	group_ref: NavigationGroup | null;
};

export const NAVIGATION_ITEM_SELECT = `
  *,
  conference_ref:conferences(*),
  group_ref:navigation_groups(*)
`;

const stripNavigationItemRelations = (
	row: Partial<NavigationItemWithRelations>,
): Partial<NavigationItemUpdate> => {
	const { conference_ref, group_ref, ...payload } = row;
	return payload;
};

export const useNavigationItems = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["navigation_items", conferenceId],
		queryFn: async (): Promise<NavigationItemWithRelations[]> => {
			const { data, error } = await neon
				.from("navigation_items")
				.select(NAVIGATION_ITEM_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return (data ?? []) as NavigationItemWithRelations[];
		},
	});
};

export const useUpsertNavigationItem = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: NavigationItemInsert | NavigationItemUpdate) => {
			const strippedPayload = stripNavigationItemRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("navigation_items")
							.update(payload)
							.eq("id", row.id)
							.select(NAVIGATION_ITEM_SELECT)
							.single()
					: await neon
							.from("navigation_items")
							.insert(payload)
							.select(NAVIGATION_ITEM_SELECT)
							.single();

			if (error) throw error;

			return data as NavigationItemWithRelations;
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
