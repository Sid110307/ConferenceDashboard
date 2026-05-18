import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type LogisticsItem = Database["public"]["Tables"]["logistics_items"]["Row"];
type LogisticsItemInsert = Database["public"]["Tables"]["logistics_items"]["Insert"];
type LogisticsItemUpdate = Database["public"]["Tables"]["logistics_items"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

type LogisticsItemRawWithRelations = LogisticsItem & {
	conference_rel: Conference | null;
};

export type LogisticsItemMapped = Omit<LogisticsItem, "conference"> & {
	conference: Conference | null;
};

export const LOGISTICS_ITEM_SELECT = `
  *,
  conference_rel:conferences(*)
`;

const mapLogisticsItem = createRelationMapper<LogisticsItemRawWithRelations, LogisticsItemMapped>({
	conference_rel: "conference",
});

const stripLogisticsItemRelations = createRelationStripper<LogisticsItemUpdate>(["conference_rel"]);

export const useLogisticsItems = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["logistics_items", conferenceId],
		queryFn: async (): Promise<LogisticsItemMapped[]> => {
			const { data, error } = await neon
				.from("logistics_items")
				.select(LOGISTICS_ITEM_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return (data ?? []) as LogisticsItemMapped[];
		},
	});
};

export const useUpsertLogisticsItem = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: LogisticsItemInsert | LogisticsItemUpdate) => {
			const strippedPayload = stripLogisticsItemRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("logistics_items")
							.update(payload)
							.eq("id", row.id)
							.select(LOGISTICS_ITEM_SELECT)
							.single()
					: await neon
							.from("logistics_items")
							.insert(payload)
							.select(LOGISTICS_ITEM_SELECT)
							.single();

			if (error) throw error;

			return mapLogisticsItem(data as LogisticsItemRawWithRelations);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["logistics_items", conferenceId] }),
	});
};

export const useDeleteLogisticsItem = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("logistics_items").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["logistics_items", conferenceId] }),
	});
};
