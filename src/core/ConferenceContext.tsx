import React, { createContext, useContext } from "react";
import { useParams } from "react-router";

import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { useQuery } from "@tanstack/react-query";

interface Ctx {
	conferenceId: string;
	isEditor: boolean;
	role: string | null;
}

type ConferenceEditorRow = Database["public"]["Tables"]["conference_editors"]["Row"];

export const ConferenceCtx = createContext<Ctx | null>(null);
export const ConferenceProvider = ({ children }: { children: React.ReactNode }) => {
	const { conferenceId } = useParams<{ conferenceId: string }>();
	const { data: session } = neon.auth.useSession();
	const userId = session?.user?.id;

	const { data: editorRow } = useQuery({
		queryKey: ["editor", conferenceId, userId],
		enabled: !!conferenceId && !!userId,
		queryFn: async () => {
			const { data, error } = await neon
				.from("conference_editors")
				.select("role,is_active")
				.eq("conference", conferenceId!)
				.eq("directus_user", userId!)
				.eq("is_active", true)
				.maybeSingle();

			if (error) throw error;

			return data;
		},
	});

	if (!conferenceId)
		return (
			<div className="p-5 text-center">
				<p className="text-red-500">Error: Conference ID is required.</p>
			</div>
		);
	return (
		<ConferenceCtx.Provider
			value={{
				conferenceId: conferenceId!,
				isEditor: !!editorRow,
				role: editorRow?.role ?? null,
			}}
		>
			{children}
		</ConferenceCtx.Provider>
	);
};

export const useConference = () => {
	const ctx = useContext(ConferenceCtx);
	if (!ctx) throw new Error("useConference must be used within a ConferenceProvider");

	return ctx;
};
