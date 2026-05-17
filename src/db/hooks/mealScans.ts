import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type MealScan = Database["public"]["Tables"]["meal_scans"]["Row"];
type MealScanInsert = Database["public"]["Tables"]["meal_scans"]["Insert"];
type MealScanUpdate = Database["public"]["Tables"]["meal_scans"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type Attendee = Database["public"]["Tables"]["attendees"]["Row"];

export type MealScanWithRelations = MealScan & {
	conference_ref: Conference | null;
	attendee_ref: Attendee | null;
};

export const MEAL_SCAN_SELECT = `
  *,
  conference_ref:conferences(*),
  attendee_ref:attendees(*)
`;

const stripMealScanRelations = (row: Partial<MealScanWithRelations>): Partial<MealScanUpdate> => {
	const { conference_ref, attendee_ref, ...payload } = row;
	return payload;
};

export const useMealScans = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["meal_scans", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("meal_scans")
				.select(MEAL_SCAN_SELECT)
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
			const strippedPayload = stripMealScanRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("meal_scans")
							.update(payload)
							.eq("id", row.id)
							.select(MEAL_SCAN_SELECT)
							.single()
					: await neon
							.from("meal_scans")
							.insert(payload)
							.select(MEAL_SCAN_SELECT)
							.single();

			if (error) throw error;

			return data as MealScanWithRelations;
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
