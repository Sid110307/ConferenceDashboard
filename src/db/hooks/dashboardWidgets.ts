import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type DashboardWidget = Database["public"]["Tables"]["dashboard_widgets"]["Row"];
type DashboardWidgetInsert = Database["public"]["Tables"]["dashboard_widgets"]["Insert"];
type DashboardWidgetUpdate = Database["public"]["Tables"]["dashboard_widgets"]["Update"];

export const useDashboardWidgets = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["dashboard_widgets", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("dashboard_widgets")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertDashboardWidget = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: DashboardWidgetInsert | DashboardWidgetUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("dashboard_widgets")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("dashboard_widgets").insert(payload).select().single();

			if (error) throw error;

			return data as DashboardWidget;
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
