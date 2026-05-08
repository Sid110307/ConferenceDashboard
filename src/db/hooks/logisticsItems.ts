import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type LogisticsItem = Database["public"]["Tables"]["logistics_items"]["Row"];
type LogisticsItemInsert = Database["public"]["Tables"]["logistics_items"]["Insert"];
type LogisticsItemUpdate = Database["public"]["Tables"]["logistics_items"]["Update"];

export const useLogisticsItems = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["logistics_items", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("logistics_items")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertLogisticsItem = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: LogisticsItemInsert | LogisticsItemUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("logistics_items")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("logistics_items").insert(payload).select().single();

			if (error) throw error;

			return data as LogisticsItem;
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
