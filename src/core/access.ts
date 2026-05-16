import { useContext } from "react";

import { neon } from "@/db/neon";

import { ConferenceCtx } from "@/core/ConferenceContext";
import type { RoleKey } from "@/core/types";

export const useUserRoles = (): RoleKey[] => {
	const ctx = useContext(ConferenceCtx);

	const isEditor = ctx?.isEditor ?? false;
	const role = ctx?.role ?? null;
	const { data } = neon.auth.useSession();

	if (!data?.user) return ["all"];
	if (!isEditor) return ["all", "viewer"];
	return ["all", "viewer", "staff", role ?? "editor"];
};
