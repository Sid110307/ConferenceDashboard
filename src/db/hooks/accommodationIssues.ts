import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type AccommodationIssue = Database["public"]["Tables"]["accommodation_issues"]["Row"];
type AccommodationIssueInsert = Database["public"]["Tables"]["accommodation_issues"]["Insert"];
type AccommodationIssueUpdate = Database["public"]["Tables"]["accommodation_issues"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type Attendee = Database["public"]["Tables"]["attendees"]["Row"];
type AccommodationRoom = Database["public"]["Tables"]["accommodation_rooms"]["Row"];

type AccommodationIssueRawWithRelations = AccommodationIssue & {
	conference_rel: Conference | null;
	attendee_rel: Attendee | null;
	room_rel: AccommodationRoom | null;
};

export type AccommodationIssueMapped = Omit<
	AccommodationIssue,
	"conference" | "attendee" | "room"
> & {
	conference: Conference | null;
	attendee: Attendee | null;
	room: AccommodationRoom | null;
};

export const ACCOMMODATION_ISSUE_SELECT = `
  *,
  conference_rel:conferences(*),
  attendee_rel:attendees(*),
  room_rel:accommodation_rooms(*)
`;

const mapAccommodationIssue = createRelationMapper<
	AccommodationIssueRawWithRelations,
	AccommodationIssueMapped
>({
	conference_rel: "conference",
	attendee_rel: "attendee",
	room_rel: "room",
});

const stripAccommodationIssueRelations = createRelationStripper<AccommodationIssueUpdate>([
	"conference_rel",
	"attendee_rel",
	"room_rel",
]);

export const useAccommodationIssues = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["accommodation_issues", conferenceId],
		queryFn: async (): Promise<AccommodationIssueMapped[]> => {
			const { data, error } = await neon
				.from("accommodation_issues")
				.select(ACCOMMODATION_ISSUE_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return ((data ?? []) as AccommodationIssueRawWithRelations[]).map(
				mapAccommodationIssue,
			);
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

			return mapAccommodationIssue(data as AccommodationIssueRawWithRelations);
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
