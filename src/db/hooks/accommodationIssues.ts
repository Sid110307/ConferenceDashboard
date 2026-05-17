import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type AccommodationIssue = Database["public"]["Tables"]["accommodation_issues"]["Row"];
type AccommodationIssueInsert = Database["public"]["Tables"]["accommodation_issues"]["Insert"];
type AccommodationIssueUpdate = Database["public"]["Tables"]["accommodation_issues"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type Attendee = Database["public"]["Tables"]["attendees"]["Row"];
type AccommodationRoom = Database["public"]["Tables"]["accommodation_rooms"]["Row"];

export type AccommodationIssueWithRelations = AccommodationIssue & {
	conference_ref: Conference | null;
	attendee_ref: Attendee | null;
	room_ref: AccommodationRoom | null;
};

export const ACCOMMODATION_ISSUE_SELECT = `
  *,
  conference_ref:conferences(*),
  attendee_ref:attendees(*),
  room_ref:accommodation_rooms(*)
`;

const stripAccommodationIssueRelations = (
	row: Partial<AccommodationIssueWithRelations>,
): Partial<AccommodationIssueUpdate> => {
	const { conference_ref, attendee_ref, room_ref, ...payload } = row;
	return payload;
};

export const useAccommodationIssues = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["accommodation_issues", conferenceId],
		queryFn: async (): Promise<AccommodationIssueWithRelations[]> => {
			const { data, error } = await neon
				.from("accommodation_issues")
				.select(ACCOMMODATION_ISSUE_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return (data ?? []) as AccommodationIssueWithRelations[];
		},
	});
};

export const useUpsertAccommodationIssue = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: AccommodationIssueInsert | AccommodationIssueUpdate) => {
			const strippedPayload = stripAccommodationIssueRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("accommodation_issues")
							.update(payload)
							.eq("id", row.id)
							.select(ACCOMMODATION_ISSUE_SELECT)
							.single()
					: await neon
							.from("accommodation_issues")
							.insert(payload)
							.select(ACCOMMODATION_ISSUE_SELECT)
							.single();

			if (error) throw error;

			return data as AccommodationIssueWithRelations;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["accommodation_issues", conferenceId] }),
	});
};

export const useDeleteAccommodationIssue = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("accommodation_issues").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["accommodation_issues", conferenceId] }),
	});
};
