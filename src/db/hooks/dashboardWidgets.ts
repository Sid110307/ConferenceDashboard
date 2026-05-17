import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type DashboardWidget = Database["public"]["Tables"]["dashboard_widgets"]["Row"];
type DashboardWidgetInsert = Database["public"]["Tables"]["dashboard_widgets"]["Insert"];
type DashboardWidgetUpdate = Database["public"]["Tables"]["dashboard_widgets"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type DashboardPage = Database["public"]["Tables"]["dashboard_pages"]["Row"];

export type DashboardWidgetWithRelations = DashboardWidget & {
	conference_ref: Conference | null;
	page_ref: DashboardPage | null;
};

export const DASHBOARD_WIDGET_SELECT = `
  *,
  conference_ref:conferences(*),
  page_ref:dashboard_pages(*)
`;

const stripDashboardWidgetRelations = (
	row: Partial<DashboardWidgetWithRelations>,
): Partial<DashboardWidgetUpdate> => {
	const { conference_ref, page_ref, ...payload } = row;
	return payload;
};

export const useDashboardWidgets = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["dashboard_widgets", conferenceId],
		queryFn: async (): Promise<DashboardWidgetWithRelations[]> => {
			const { data, error } = await neon
				.from("dashboard_widgets")
				.select(DASHBOARD_WIDGET_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return (data ?? []) as DashboardWidgetWithRelations[];
		},
	});
};

export const useUpsertDashboardWidget = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: DashboardWidgetInsert | DashboardWidgetUpdate) => {
			const strippedPayload = stripDashboardWidgetRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("dashboard_widgets")
							.update(payload)
							.eq("id", row.id)
							.select(DASHBOARD_WIDGET_SELECT)
							.single()
					: await neon
							.from("dashboard_widgets")
							.insert(payload)
							.select(DASHBOARD_WIDGET_SELECT)
							.single();

			if (error) throw error;

			return data as DashboardWidgetWithRelations;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard_widgets", conferenceId] }),
	});
};

export const useDeleteDashboardWidget = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("dashboard_widgets").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard_widgets", conferenceId] }),
	});
};
