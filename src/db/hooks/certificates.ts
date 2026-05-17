import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Certificate = Database["public"]["Tables"]["certificates"]["Row"];
type CertificateInsert = Database["public"]["Tables"]["certificates"]["Insert"];
type CertificateUpdate = Database["public"]["Tables"]["certificates"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type Attendee = Database["public"]["Tables"]["attendees"]["Row"];

export type CertificateWithRelations = Certificate & {
	conference_ref: Conference | null;
	attendee_ref: Attendee | null;
};

export const CERTIFICATE_SELECT = `
  *,
  conference_ref:conferences(*),
  attendee_ref:attendees(*)
`;

const stripCertificateRelations = (
	row: Partial<CertificateWithRelations>,
): Partial<CertificateUpdate> => {
	const { conference_ref, attendee_ref, ...payload } = row;
	return payload;
};

export const useCertificates = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["certificates", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("certificates")
				.select(CERTIFICATE_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return data ?? [];
		},
	});
};

export const useUpsertCertificate = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (row: CertificateInsert | CertificateUpdate) => {
			const strippedPayload = stripCertificateRelations(row);
			const payload = { ...strippedPayload, conference: conferenceId };

			const { data, error } =
				"id" in row && row.id
					? await neon
							.from("certificates")
							.update(payload)
							.eq("id", row.id)
							.select(CERTIFICATE_SELECT)
							.single()
					: await neon
							.from("certificates")
							.insert(payload)
							.select(CERTIFICATE_SELECT)
							.single();

			if (error) throw error;

			return data as CertificateWithRelations;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["certificates", conferenceId] }),
	});
};

export const useDeleteCertificate = () => {
	const qc = useQueryClient();
	const { conferenceId } = useConference();

	return useMutation({
		mutationFn: async (id: string) => {
			const { error } = await neon.from("certificates").delete().eq("id", id);

			if (error) throw error;
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["certificates", conferenceId] }),
	});
};
