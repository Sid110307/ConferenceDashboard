import { useContext } from "react";

import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useQuery } from "@tanstack/react-query";

import { ConferenceCtx } from "@/core/ConferenceContext";

type ConferenceRow = Database["public"]["Tables"]["conferences"]["Row"];

export const useConferenceDetails = () => {
	const result = useContext(ConferenceCtx);
	return useQuery({
		queryKey: ["conferences", result?.conferenceId || "none"],
		queryFn: async () => {
			if (!result?.conferenceId) return null;
			const { data, error } = await neon
				.from("conferences")
				.select("*")
				.eq("id", result?.conferenceId)
				.maybeSingle();

			if (error) throw error;
			return (data ?? null) as ConferenceRow | null;
		},
	});
};
