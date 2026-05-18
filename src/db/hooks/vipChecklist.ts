import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type VipChecklist = Database["public"]["Tables"]["vip_checklist"]["Row"];
type VipChecklistInsert = Database["public"]["Tables"]["vip_checklist"]["Insert"];
type VipChecklistUpdate = Database["public"]["Tables"]["vip_checklist"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

type VipChecklistRawWithRelations = VipChecklist & {
	conference_rel: Conference | null;
};

export type VipChecklistMapped = Omit<VipChecklist, "conference"> & {
	conference: Conference | null;
};

export const VIP_CHECKLIST_SELECT = `
  *,
  conference_rel:conferences(*)
`;

const mapVipChecklist = createRelationMapper<VipChecklistRawWithRelations, VipChecklistMapped>({
	conference_rel: "conference",
});

const stripVipChecklistRelations = createRelationStripper<VipChecklistUpdate>(["conference_rel"]);

export const useVipChecklist = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["vip_checklist", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("vip_checklist")
				.select(VIP_CHECKLIST_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return ((data ?? []) as VipChecklistRawWithRelations[]).map(mapVipChecklist);
		},
	});
};

export const useUpsertVipChecklist = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: VipChecklistInsert | VipChecklistUpdate) => {
			const strippedPayload = stripVipChecklistRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("vip_checklist")
							.update(payload)
							.eq("id", row.id)
							.select(VIP_CHECKLIST_SELECT)
							.single()
					: await neon
							.from("vip_checklist")
							.insert(payload)
							.select(VIP_CHECKLIST_SELECT)
							.single();

			if (error) throw error;

			return mapVipChecklist(data as VipChecklistRawWithRelations);
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
