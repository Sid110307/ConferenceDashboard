import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type TravelArrival = Database["public"]["Tables"]["travel_arrivals"]["Row"];
type TravelArrivalInsert = Database["public"]["Tables"]["travel_arrivals"]["Insert"];
type TravelArrivalUpdate = Database["public"]["Tables"]["travel_arrivals"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type Attendee = Database["public"]["Tables"]["attendees"]["Row"];

type TravelArrivalRawWithRelations = TravelArrival & {
	conference_rel: Conference | null;
	attendee_rel: Attendee | null;
};

export type TravelArrivalMapped = Omit<TravelArrival, "conference" | "attendee"> & {
	conference: Conference | null;
	attendee: Attendee | null;
};

export const TRAVEL_ARRIVAL_SELECT = `
  *,
  conference_rel:conferences(*),
  attendee_rel:attendees(*)
`;

const mapTravelArrival = createRelationMapper<TravelArrivalRawWithRelations, TravelArrivalMapped>({
	conference_rel: "conference",
	attendee_rel: "attendee",
});

const stripTravelArrivalRelations = createRelationStripper<TravelArrivalUpdate>([
	"conference_rel",
	"attendee_rel",
]);

export const useTravelArrivals = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["travel_arrivals", conferenceId],
		queryFn: async (): Promise<TravelArrivalMapped[]> => {
			const { data, error } = await neon
				.from("travel_arrivals")
				.select(TRAVEL_ARRIVAL_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return ((data ?? []) as TravelArrivalRawWithRelations[]).map(mapTravelArrival);
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

			return mapTravelArrival(data as TravelArrivalRawWithRelations);
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
