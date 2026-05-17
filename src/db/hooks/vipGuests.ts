import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type VipGuest = Database["public"]["Tables"]["vip_guests"]["Row"];
type VipGuestInsert = Database["public"]["Tables"]["vip_guests"]["Insert"];
type VipGuestUpdate = Database["public"]["Tables"]["vip_guests"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

export type VipGuestWithRelations = VipGuest & {
	conference_ref: Conference | null;
};

export const VIP_GUEST_SELECT = `
  *,
  conference_ref:conferences(*)
`;

const stripVipGuestRelations = (row: Partial<VipGuestWithRelations>): Partial<VipGuestUpdate> => {
	const { conference_ref, ...payload } = row;
	return payload;
};

export const useVipGuests = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["vip_guests", conferenceId],
		queryFn: async (): Promise<VipGuestWithRelations[]> => {
			const { data, error } = await neon
				.from("vip_guests")
				.select(VIP_GUEST_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return (data ?? []) as VipGuestWithRelations[];
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

			return data as VipGuestWithRelations;
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
