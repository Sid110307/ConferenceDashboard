import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type FoodPlan = Database["public"]["Tables"]["food_plans"]["Row"];
type FoodPlanInsert = Database["public"]["Tables"]["food_plans"]["Insert"];
type FoodPlanUpdate = Database["public"]["Tables"]["food_plans"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

export type FoodPlanWithRelations = FoodPlan & {
	conference_ref: Conference | null;
};

export const FOOD_PLAN_SELECT = `
  *,
  conference_ref:conferences(*)
`;

const stripFoodPlanRelations = (row: Partial<FoodPlanWithRelations>): Partial<FoodPlanUpdate> => {
	const { conference_ref, ...payload } = row;
	return payload;
};

export const useFoodPlans = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["food_plans", conferenceId],
		queryFn: async (): Promise<FoodPlanWithRelations[]> => {
			const { data, error } = await neon
				.from("food_plans")
				.select(FOOD_PLAN_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return (data ?? []) as FoodPlanWithRelations[];
		},
	});
};

export const useUpsertFoodPlan = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: FoodPlanInsert | FoodPlanUpdate) => {
			const strippedPayload = stripFoodPlanRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("food_plans")
							.update(payload)
							.eq("id", row.id)
							.select(FOOD_PLAN_SELECT)
							.single()
					: await neon
							.from("food_plans")
							.insert(payload)
							.select(FOOD_PLAN_SELECT)
							.single();

			if (error) throw error;

			return data as FoodPlanWithRelations;
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
