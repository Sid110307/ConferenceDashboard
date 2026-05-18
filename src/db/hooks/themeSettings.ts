import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type ThemeSetting = Database["public"]["Tables"]["theme_settings"]["Row"];
type ThemeSettingInsert = Database["public"]["Tables"]["theme_settings"]["Insert"];
type ThemeSettingUpdate = Database["public"]["Tables"]["theme_settings"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

type ThemeSettingRawWithRelations = ThemeSetting & {
	conference_rel: Conference | null;
};

export type ThemeSettingMapped = Omit<ThemeSetting, "conference"> & {
	conference: Conference | null;
};

export const THEME_SETTING_SELECT = `
  *,
  conference_rel:conferences(*)
`;

const mapThemeSetting = createRelationMapper<ThemeSettingRawWithRelations, ThemeSettingMapped>({
	conference_rel: "conference",
});

const stripThemeSettingRelations = createRelationStripper<ThemeSettingUpdate>(["conference_rel"]);

export const useThemeSettings = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["theme_settings", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("theme_settings")
				.select(THEME_SETTING_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return ((data ?? []) as ThemeSettingRawWithRelations[]).map(mapThemeSetting);
		},
	});
};

export const useUpsertThemeSetting = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: ThemeSettingInsert | ThemeSettingUpdate) => {
			const strippedPayload = stripThemeSettingRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("theme_settings")
							.update(payload)
							.eq("id", row.id)
							.select(THEME_SETTING_SELECT)
							.single()
					: await neon
							.from("theme_settings")
							.insert(payload)
							.select(THEME_SETTING_SELECT)
							.single();

			if (error) throw error;

			return mapThemeSetting(data as ThemeSettingRawWithRelations);
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
