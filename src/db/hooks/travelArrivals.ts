import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type TravelArrival = Database["public"]["Tables"]["travel_arrivals"]["Row"];
type TravelArrivalInsert = Database["public"]["Tables"]["travel_arrivals"]["Insert"];
type TravelArrivalUpdate = Database["public"]["Tables"]["travel_arrivals"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type Attendee = Database["public"]["Tables"]["attendees"]["Row"];

export type TravelArrivalWithRelations = TravelArrival & {
	conference_ref: Conference | null;
	attendee_ref: Attendee | null;
};

export const TRAVEL_ARRIVAL_SELECT = `
  *,
  conference_ref:conferences(*),
  attendee_ref:attendees(*)
`;

const stripTravelArrivalRelations = (
	row: Partial<TravelArrivalWithRelations>,
): Partial<TravelArrivalUpdate> => {
	const { conference_ref, attendee_ref, ...payload } = row;
	return payload;
};

export const useTravelArrivals = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["travel_arrivals", conferenceId],
		queryFn: async (): Promise<TravelArrivalWithRelations[]> => {
			const { data, error } = await neon
				.from("travel_arrivals")
				.select(TRAVEL_ARRIVAL_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return (data ?? []) as TravelArrivalWithRelations[];
		},
	});
};

export const useUpsertTravelArrival = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: TravelArrivalInsert | TravelArrivalUpdate) => {
			const strippedPayload = stripTravelArrivalRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("travel_arrivals")
							.update(payload)
							.eq("id", row.id)
							.select(TRAVEL_ARRIVAL_SELECT)
							.single()
					: await neon
							.from("travel_arrivals")
							.insert(payload)
							.select(TRAVEL_ARRIVAL_SELECT)
							.single();

			if (error) throw error;

			return data as TravelArrivalWithRelations;
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
