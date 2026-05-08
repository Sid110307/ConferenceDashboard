import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type VipGuest = Database["public"]["Tables"]["vip_guests"]["Row"];
type VipGuestInsert = Database["public"]["Tables"]["vip_guests"]["Insert"];
type VipGuestUpdate = Database["public"]["Tables"]["vip_guests"]["Update"];

export const useVipGuests = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["vip_guests", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("vip_guests")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertVipGuest = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: VipGuestInsert | VipGuestUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("vip_guests")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("vip_guests").insert(payload).select().single();

			if (error) throw error;

			return data as VipGuest;
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
