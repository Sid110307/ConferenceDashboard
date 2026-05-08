import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type ThemeSetting = Database["public"]["Tables"]["theme_settings"]["Row"];
type ThemeSettingInsert = Database["public"]["Tables"]["theme_settings"]["Insert"];
type ThemeSettingUpdate = Database["public"]["Tables"]["theme_settings"]["Update"];

export const useThemeSettings = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["theme_settings", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("theme_settings")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertThemeSetting = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: ThemeSettingInsert | ThemeSettingUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("theme_settings")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("theme_settings").insert(payload).select().single();

			if (error) throw error;

			return data as ThemeSetting;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["theme_settings", conferenceId] }),
	});
};

export const useDeleteThemeSetting = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("theme_settings").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["theme_settings", conferenceId] }),
	});
};
