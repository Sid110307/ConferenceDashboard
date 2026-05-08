import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type MealScan = Database["public"]["Tables"]["meal_scans"]["Row"];
type MealScanInsert = Database["public"]["Tables"]["meal_scans"]["Insert"];
type MealScanUpdate = Database["public"]["Tables"]["meal_scans"]["Update"];

export const useMealScans = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["meal_scans", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("meal_scans")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertMealScan = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: MealScanInsert | MealScanUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("meal_scans")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("meal_scans").insert(payload).select().single();

			if (error) throw error;

			return data as MealScan;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["meal_scans", conferenceId] }),
	});
};

export const useDeleteMealScan = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("meal_scans").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["meal_scans", conferenceId] }),
	});
};
