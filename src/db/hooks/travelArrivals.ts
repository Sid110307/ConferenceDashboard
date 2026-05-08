import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type TravelArrival = Database["public"]["Tables"]["travel_arrivals"]["Row"];
type TravelArrivalInsert = Database["public"]["Tables"]["travel_arrivals"]["Insert"];
type TravelArrivalUpdate = Database["public"]["Tables"]["travel_arrivals"]["Update"];

export const useTravelArrivals = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["travel_arrivals", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("travel_arrivals")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertTravelArrival = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: TravelArrivalInsert | TravelArrivalUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("travel_arrivals")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("travel_arrivals").insert(payload).select().single();

			if (error) throw error;

			return data as TravelArrival;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["travel_arrivals", conferenceId] }),
	});
};

export const useDeleteTravelArrival = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("travel_arrivals").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["travel_arrivals", conferenceId] }),
	});
};
