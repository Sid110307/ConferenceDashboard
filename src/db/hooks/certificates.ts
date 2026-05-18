import { neon } from "@/db/neon";
import { createRelationMapper, createRelationStripper } from "@/db/normalization";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Certificate = Database["public"]["Tables"]["certificates"]["Row"];
type CertificateInsert = Database["public"]["Tables"]["certificates"]["Insert"];
type CertificateUpdate = Database["public"]["Tables"]["certificates"]["Update"];
type Conference = Database["public"]["Tables"]["conferences"]["Row"];
type Attendee = Database["public"]["Tables"]["attendees"]["Row"];

type CertificateRawWithRelations = Certificate & {
	conference_rel: Conference | null;
	attendee_rel: Attendee | null;
};

export type CertificateMapped = Omit<Certificate, "conference" | "attendee"> & {
	conference: Conference | null;
	attendee: Attendee | null;
};

export const CERTIFICATE_SELECT = `
  *,
  conference_rel:conferences(*),
  attendee_rel:attendees(*)
`;

const mapCertificate = createRelationMapper<CertificateRawWithRelations, CertificateMapped>({
	conference_rel: "conference",
	attendee_rel: "attendee",
});

const stripCertificateRelations = createRelationStripper<CertificateUpdate>([
	"conference_rel",
	"attendee_rel",
]);

export const useCertificates = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["certificates", conferenceId],
		queryFn: async (): Promise<CertificateMapped[]> => {
			const { data, error } = await neon
				.from("certificates")
				.select(CERTIFICATE_SELECT)
				.eq("conference", conferenceId);

			if (error) throw error;

			return ((data ?? []) as CertificateRawWithRelations[]).map(mapCertificate);
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

			return mapCertificate(data as CertificateRawWithRelations);
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
