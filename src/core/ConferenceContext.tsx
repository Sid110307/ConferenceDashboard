import { createContext, useContext } from "react";
import { useParams } from "react-router";

import { neon } from "@/db/neon";
import { useQuery } from "@tanstack/react-query";

interface Ctx {
	conferenceId: string;
	isEditor: boolean;
	role: string | null;
}
const ConferenceCtx = createContext<Ctx | null>(null);

export const ConferenceProvider = ({ children }: { children: React.ReactNode }) => {
	const { conferenceId } = useParams<{ conferenceId: string }>();
	const { data: session } = neon.auth.useSession();
	const userId = session?.user?.id;

	const { data: editorRow } = useQuery<any>({
		queryKey: ["editor", conferenceId, userId],
		enabled: !!conferenceId && !!userId,
		queryFn: () =>
			neon
				.from("conference_editors")
				.select("role,is_active")
				.eq("conference", conferenceId!)
				.eq("directus_user", userId!)
				.eq("is_active", true)
				.maybeSingle(),
	});

	return (
		<ConferenceCtx.Provider
			value={{
				conferenceId: conferenceId!,
				isEditor: !!editorRow?.data,
				role: editorRow?.data?.role ?? null,
			}}
		>
			{children}
		</ConferenceCtx.Provider>
	);
};

export const useConference = () => useContext(ConferenceCtx);
