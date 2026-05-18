import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type DashboardPage = Database["public"]["Tables"]["dashboard_pages"]["Row"];
type DashboardPageInsert = Database["public"]["Tables"]["dashboard_pages"]["Insert"];
type DashboardPageUpdate = Database["public"]["Tables"]["dashboard_pages"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

type DashboardPageRawWithRelations = DashboardPage & {
	conference_rel: Conference | null;
};

export type DashboardPageMapped = Omit<DashboardPage, "conference"> & {
	conference: Conference | null;
};

export const DASHBOARD_PAGE_SELECT = `
  *,
  conference_rel:conferences(*)
`;

const mapDashboardPage = createRelationMapper<DashboardPageRawWithRelations, DashboardPageMapped>({
	conference_rel: "conference",
});

const stripDashboardPageRelations = createRelationStripper<DashboardPageUpdate>(["conference_rel"]);

export const useDashboardPages = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["dashboard_pages", conferenceId],
		queryFn: async (): Promise<DashboardPageMapped[]> => {
			const { data, error } = await neon
				.from("dashboard_pages")
				.select(DASHBOARD_PAGE_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return (data ?? []) as DashboardPageMapped[];
		},
	});
};

export const useUpsertDashboardPage = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: DashboardPageInsert | DashboardPageUpdate) => {
			const strippedPayload = stripDashboardPageRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("dashboard_pages")
							.update(payload)
							.eq("id", row.id)
							.select(DASHBOARD_PAGE_SELECT)
							.single()
					: await neon
							.from("dashboard_pages")
							.insert(payload)
							.select(DASHBOARD_PAGE_SELECT)
							.single();

			if (error) throw error;

			return mapDashboardPage(data as DashboardPageRawWithRelations);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard_pages", conferenceId] }),
	});
};

export const useDeleteDashboardPage = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("dashboard_pages").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard_pages", conferenceId] }),
	});
};
