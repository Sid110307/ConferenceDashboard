import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { useConference } from "@/core/ConferenceContext";

type Certificate = Database["public"]["Tables"]["certificates"]["Row"];
type CertificateInsert = Database["public"]["Tables"]["certificates"]["Insert"];
type CertificateUpdate = Database["public"]["Tables"]["certificates"]["Update"];

export const useCertificates = () => {
	const { conferenceId } = useConference();

	return useQuery({
		queryKey: ["certificates", conferenceId],
		queryFn: async () => {
			const { data, error } = await neon
				.from("certificates")
				.select("*")
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
			const payload = { ...row, conference: conferenceId };

			const { data, error } =
				"id" in payload && payload.id
					? await neon
							.from("certificates")
							.update(payload)
							.eq("id", payload.id)
							.select()
							.single()
					: await neon.from("certificates").insert(payload).select().single();

			if (error) throw error;

			return data as Certificate;
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
