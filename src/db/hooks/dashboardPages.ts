import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type DashboardPage = Database["public"]["Tables"]["dashboard_pages"]["Row"];
type DashboardPageInsert = Database["public"]["Tables"]["dashboard_pages"]["Insert"];
type DashboardPageUpdate = Database["public"]["Tables"]["dashboard_pages"]["Update"];

export const useDashboardPages = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["dashboard_pages", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("dashboard_pages")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertDashboardPage = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: DashboardPageInsert | DashboardPageUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("dashboard_pages")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("dashboard_pages").insert(payload).select().single();

			if (error) throw error;

			return data as DashboardPage;
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
