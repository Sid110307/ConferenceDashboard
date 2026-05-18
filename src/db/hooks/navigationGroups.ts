import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type NavigationGroup = Database["public"]["Tables"]["navigation_groups"]["Row"];
type NavigationGroupInsert = Database["public"]["Tables"]["navigation_groups"]["Insert"];
type NavigationGroupUpdate = Database["public"]["Tables"]["navigation_groups"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

type NavigationGroupRawWithRelations = NavigationGroup & {
	conference_rel: Conference | null;
};

export type NavigationGroupMapped = Omit<NavigationGroup, "conference"> & {
	conference: Conference | null;
};

export const NAVIGATION_GROUP_SELECT = `
  *,
  conference_rel:conferences(*)
`;

const mapNavigationGroup = createRelationMapper<
	NavigationGroupRawWithRelations,
	NavigationGroupMapped
>({
	conference_rel: "conference",
});

const stripNavigationGroupRelations = createRelationStripper<NavigationGroupUpdate>([
	"conference_rel",
]);

export const useNavigationGroups = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["navigation_groups", conferenceId],
		queryFn: async (): Promise<NavigationGroupMapped[]> => {
			const { data, error } = await neon
				.from("navigation_groups")
				.select(NAVIGATION_GROUP_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return (data ?? []) as NavigationGroupMapped[];
		},
	});
};

export const useUpsertNavigationGroup = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: NavigationGroupInsert | NavigationGroupUpdate) => {
			const strippedPayload = stripNavigationGroupRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("navigation_groups")
							.update(payload)
							.eq("id", row.id)
							.select(NAVIGATION_GROUP_SELECT)
							.single()
					: await neon
							.from("navigation_groups")
							.insert(payload)
							.select(NAVIGATION_GROUP_SELECT)
							.single();

			if (error) throw error;

			return mapNavigationGroup(data as NavigationGroupRawWithRelations);
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
