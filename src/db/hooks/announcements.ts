import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
type AnnouncementInsert = Database["public"]["Tables"]["announcements"]["Insert"];
type AnnouncementUpdate = Database["public"]["Tables"]["announcements"]["Update"];

export const useAnnouncements = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["announcements", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("announcements")
				.select("*")
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertAnnouncement = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: AnnouncementInsert | AnnouncementUpdate) => {
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("announcements")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("announcements").insert(payload).select().single();

			if (error) throw error;

			return data as Announcement;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements", conferenceId] }),
	});
};

export const useDeleteAnnouncement = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("announcements").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["announcements", conferenceId] }),
	});
};
