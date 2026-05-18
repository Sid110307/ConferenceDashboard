import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type MealScan = Database["public"]["Tables"]["meal_scans"]["Row"];
type MealScanInsert = Database["public"]["Tables"]["meal_scans"]["Insert"];
type MealScanUpdate = Database["public"]["Tables"]["meal_scans"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type Attendee = Database["public"]["Tables"]["attendees"]["Row"];

type MealScanRawWithRelations = MealScan & {
	conference_rel: Conference | null;
	attendee_rel: Attendee | null;
};

export type MealScanMapped = Omit<MealScan, "conference" | "attendee"> & {
	conference: Conference | null;
	attendee: Attendee | null;
};

export const MEAL_SCAN_SELECT = `
  *,
  conference_rel:conferences(*),
  attendee_rel:attendees(*)
`;

const mapMealScan = createRelationMapper<MealScanRawWithRelations, MealScanMapped>({
	conference_rel: "conference",
	attendee_rel: "attendee",
});

const stripMealScanRelations = createRelationStripper<MealScanUpdate>([
	"conference_rel",
	"attendee_rel",
]);

export const useMealScans = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["meal_scans", conferenceId],
		queryFn: async (): Promise<MealScanMapped[]> => {
			const { data, error } = await neon
				.from("meal_scans")
				.select(MEAL_SCAN_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return ((data ?? []) as MealScanRawWithRelations[]).map(mapMealScan);
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

			return mapMealScan(data as MealScanRawWithRelations);
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
