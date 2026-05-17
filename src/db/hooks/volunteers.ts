import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Volunteer = Database["public"]["Tables"]["volunteers"]["Row"];
type VolunteerInsert = Database["public"]["Tables"]["volunteers"]["Insert"];
type VolunteerUpdate = Database["public"]["Tables"]["volunteers"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

export type VolunteerWithRelations = Volunteer & {
	conference_ref: Conference | null;
};

export const VOLUNTEER_SELECT = `
  *,
  conference_ref:conferences(*)
`;

const stripVolunteerRelations = (
	row: Partial<VolunteerWithRelations>,
): Partial<VolunteerUpdate> => {
	const { conference_ref, ...payload } = row;
	return payload;
};

export const useVolunteers = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["volunteers", conferenceId],
		queryFn: async (): Promise<VolunteerWithRelations[]> => {
			const { data, error } = await neon
				.from("volunteers")
				.select(VOLUNTEER_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return (data ?? []) as VolunteerWithRelations[];
		},
	});
};

export const useUpsertVolunteer = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: VolunteerInsert | VolunteerUpdate) => {
			const strippedPayload = stripVolunteerRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("volunteers")
							.update(payload)
							.eq("id", row.id)
							.select(VOLUNTEER_SELECT)
							.single()
					: await neon
							.from("volunteers")
							.insert(payload)
							.select(VOLUNTEER_SELECT)
							.single();

			if (error) throw error;

			return data as VolunteerWithRelations;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["volunteers", conferenceId] }),
	});
};

export const useDeleteVolunteer = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("volunteers").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["volunteers", conferenceId] }),
	});
};
