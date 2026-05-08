import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type FoodPlan = Database["public"]["Tables"]["food_plans"]["Row"];
type FoodPlanInsert = Database["public"]["Tables"]["food_plans"]["Insert"];
type FoodPlanUpdate = Database["public"]["Tables"]["food_plans"]["Update"];

export const useFoodPlans = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["food_plans", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("food_plans")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertFoodPlan = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: FoodPlanInsert | FoodPlanUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("food_plans")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("food_plans").insert(payload).select().single();

			if (error) throw error;

			return data as FoodPlan;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["food_plans", conferenceId] }),
	});
};

export const useDeleteFoodPlan = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("food_plans").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["food_plans", conferenceId] }),
	});
};
