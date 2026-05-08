import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type AppSetting = Database["public"]["Tables"]["app_settings"]["Row"];
type AppSettingInsert = Database["public"]["Tables"]["app_settings"]["Insert"];
type AppSettingUpdate = Database["public"]["Tables"]["app_settings"]["Update"];

export const useAppSettings = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["app_settings", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("app_settings")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertAppSetting = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: AppSettingInsert | AppSettingUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("app_settings")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("app_settings").insert(payload).select().single();

			if (error) throw error;

			return data as AppSetting;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["app_settings", conferenceId] }),
	});
};

export const useDeleteAppSetting = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("app_settings").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["app_settings", conferenceId] }),
	});
};
