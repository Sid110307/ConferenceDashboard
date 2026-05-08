import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type VipChecklist = Database["public"]["Tables"]["vip_checklist"]["Row"];
type VipChecklistInsert = Database["public"]["Tables"]["vip_checklist"]["Insert"];
type VipChecklistUpdate = Database["public"]["Tables"]["vip_checklist"]["Update"];

export const useVipChecklist = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["vip_checklist", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("vip_checklist")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertVipChecklist = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: VipChecklistInsert | VipChecklistUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("vip_checklist")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("vip_checklist").insert(payload).select().single();

			if (error) throw error;

			return data as VipChecklist;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["vip_checklist", conferenceId] }),
	});
};

export const useDeleteVipChecklist = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("vip_checklist").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["vip_checklist", conferenceId] }),
	});
};
