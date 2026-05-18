import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type VipGuest = Database["public"]["Tables"]["vip_guests"]["Row"];
type VipGuestInsert = Database["public"]["Tables"]["vip_guests"]["Insert"];
type VipGuestUpdate = Database["public"]["Tables"]["vip_guests"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

type VipGuestRawWithRelations = VipGuest & {
	conference_rel: Conference | null;
};

export type VipGuestMapped = Omit<VipGuest, "conference"> & {
	conference: Conference | null;
};

export const VIP_GUEST_SELECT = `
  *,
  conference_rel:conferences(*)
`;

const mapVipGuest = createRelationMapper<VipGuestRawWithRelations, VipGuestMapped>({
	conference_rel: "conference",
});

const stripVipGuestRelations = createRelationStripper<VipGuestUpdate>(["conference_rel"]);

export const useVipGuests = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["vip_guests", conferenceId],
		queryFn: async (): Promise<VipGuestMapped[]> => {
			const { data, error } = await neon
				.from("vip_guests")
				.select(VIP_GUEST_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return (data ?? []) as VipGuestMapped[];
		},
	});
};

export const useUpsertVipGuest = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: VipGuestInsert | VipGuestUpdate) => {
			const strippedPayload = stripVipGuestRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("vip_guests")
							.update(payload)
							.eq("id", row.id)
							.select(VIP_GUEST_SELECT)
							.single()
					: await neon
							.from("vip_guests")
							.insert(payload)
							.select(VIP_GUEST_SELECT)
							.single();

			if (error) throw error;

			return mapVipGuest(data as VipGuestRawWithRelations);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["vip_guests", conferenceId] }),
	});
};

export const useDeleteVipGuest = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("vip_guests").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["vip_guests", conferenceId] }),
	});
};
