import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Attendee = Database["public"]["Tables"]["attendees"]["Row"];
type AttendeeInsert = Database["public"]["Tables"]["attendees"]["Insert"];
type AttendeeUpdate = Database["public"]["Tables"]["attendees"]["Update"];

export const useAttendees = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["attendees", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("attendees")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertAttendee = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: AttendeeInsert | AttendeeUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("attendees")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("attendees").insert(payload).select().single();

			if (error) throw error;

			return data as Attendee;
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
