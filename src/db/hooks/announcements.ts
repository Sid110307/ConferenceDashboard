import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Announcement = Database["public"]["Tables"]["announcements"]["Row"];
type AnnouncementInsert = Database["public"]["Tables"]["announcements"]["Insert"];
type AnnouncementUpdate = Database["public"]["Tables"]["announcements"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];

type AnnouncementRawWithRelations = Announcement & {
	conference_rel: Conference | null;
};

export type AnnouncementMapped = Omit<Announcement, "conference"> & {
	conference: Conference | null;
};

export const ANNOUNCEMENT_SELECT = `
  *,
  conference_rel:conferences(*)
`;

const mapAnnouncement = createRelationMapper<AnnouncementRawWithRelations, AnnouncementMapped>({
	conference_rel: "conference",
});

const stripAnnouncementRelations = createRelationStripper<AnnouncementUpdate>(["conference_rel"]);

export const useAnnouncements = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["announcements", conferenceId],
		queryFn: async (): Promise<AnnouncementMapped[]> => {
			const { data, error } = await neon
				.from("announcements")
				.select(ANNOUNCEMENT_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return ((data ?? []) as AnnouncementRawWithRelations[]).map(mapAnnouncement);
		},
	});
};

export const useUpsertAnnouncement = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: AnnouncementInsert | AnnouncementUpdate) => {
			const strippedPayload = stripAnnouncementRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("announcements")
							.update(payload)
							.eq("id", row.id)
							.select(ANNOUNCEMENT_SELECT)
							.single()
					: await neon
							.from("announcements")
							.insert(payload)
							.select(ANNOUNCEMENT_SELECT)
							.single();

			if (error) throw error;

			return mapAnnouncement(data as AnnouncementRawWithRelations);
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
