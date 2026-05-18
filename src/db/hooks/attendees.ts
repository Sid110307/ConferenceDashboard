import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Attendee = Database["public"]["Tables"]["attendees"]["Row"];
type AttendeeInsert = Database["public"]["Tables"]["attendees"]["Insert"];
type AttendeeUpdate = Database["public"]["Tables"]["attendees"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

type AttendeeRawWithRelations = Attendee & {
	conference_rel: Conference | null;
};

export type AttendeeMapped = Omit<Attendee, "conference"> & {
	conference: Conference | null;
};

export const ATTENDEE_SELECT = `
  *,
  conference_rel:conferences(*)
`;

const mapAttendee = createRelationMapper<AttendeeRawWithRelations, AttendeeMapped>({
	conference_rel: "conference",
});

const stripAttendeeRelations = createRelationStripper<AttendeeUpdate>(["conference_rel"]);

export const useAttendees = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["attendees", conferenceId],
		queryFn: async (): Promise<AttendeeMapped[]> => {
			const { data, error } = await neon
				.from("attendees")
				.select(ATTENDEE_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return ((data ?? []) as AttendeeRawWithRelations[]).map(mapAttendee);
		},
	});
};

export const useUpsertAttendee = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: AttendeeInsert | AttendeeUpdate) => {
			const strippedPayload = stripAttendeeRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("attendees")
							.update(payload)
							.eq("id", row.id)
							.select(ATTENDEE_SELECT)
							.single()
					: await neon.from("attendees").insert(payload).select(ATTENDEE_SELECT).single();

			if (error) throw error;

			return mapAttendee(data as AttendeeRawWithRelations);
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["attendees", conferenceId] }),
	});
};

export const useDeleteAttendee = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("attendees").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["attendees", conferenceId] }),
	});
};
