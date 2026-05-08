import { neon } from "@/db/neon";

import { useConference } from "@/core/ConferenceContext";
import type { RoleKey } from "@/core/types";

export const useUserRoles = (): RoleKey[] => {
	let isEditor = false;
	let role: string | null = null;
	try {
		const ctx = useConference();
		isEditor = ctx.isEditor;
		role = ctx.role;
	} catch {}
	const { data } = neon.auth.useSession();

	if (!data?.user) return ["all"];
	if (!isEditor) return ["all", "viewer"];
	return ["all", "viewer", "staff", role ?? "editor"];
};
