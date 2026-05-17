import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type FinanceItem = Database["public"]["Tables"]["finance_items"]["Row"];
type FinanceItemInsert = Database["public"]["Tables"]["finance_items"]["Insert"];
type FinanceItemUpdate = Database["public"]["Tables"]["finance_items"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

export type FinanceItemWithRelations = FinanceItem & {
	conference_ref: Conference | null;
};

export const FINANCE_ITEM_SELECT = `
  *,
  conference_ref:conferences(*)
`;

const stripFinanceItemRelations = (
	row: Partial<FinanceItemWithRelations>,
): Partial<FinanceItemUpdate> => {
	const { conference_ref, ...payload } = row;
	return payload;
};

export const useFinanceItems = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["finance_items", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("finance_items")
				.select(FINANCE_ITEM_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertFinanceItem = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: FinanceItemInsert | FinanceItemUpdate) => {
			const strippedPayload = stripFinanceItemRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("finance_items")
							.update(payload)
							.eq("id", row.id)
							.select(FINANCE_ITEM_SELECT)
							.single()
					: await neon
							.from("finance_items")
							.insert(payload)
							.select(FINANCE_ITEM_SELECT)
							.single();

			if (error) throw error;

			return data as FinanceItemWithRelations;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["finance_items", conferenceId] }),
	});
};

export const useDeleteFinanceItem = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("finance_items").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["finance_items", conferenceId] }),
	});
};
