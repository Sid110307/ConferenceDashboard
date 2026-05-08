import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type AccommodationAllocation = Database["public"]["Tables"]["accommodation_allocations"]["Row"];
type AccommodationAllocationInsert =
	Database["public"]["Tables"]["accommodation_allocations"]["Insert"];
type AccommodationAllocationUpdate =
	Database["public"]["Tables"]["accommodation_allocations"]["Update"];

export const useAccommodationAllocations = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["accommodation_allocations", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("accommodation_allocations")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertAccommodationAllocation = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: AccommodationAllocationInsert | AccommodationAllocationUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("accommodation_allocations")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon
							.from("accommodation_allocations")
							.insert(payload)
							.select()
							.single();

			if (error) throw error;

			return data as AccommodationAllocation;
		},
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["accommodation_allocations", conferenceId] }),
	});
};

export const useDeleteAccommodationAllocation = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("accommodation_allocations").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () =>
			qc.invalidateQueries({ queryKey: ["accommodation_allocations", conferenceId] }),
	});
};
