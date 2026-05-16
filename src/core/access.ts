import { useContext } from "react";

import { neon } from "@/db/neon";

import { ConferenceCtx } from "@/core/ConferenceContext";
import type { RoleKey } from "@/core/types";

const ROLE_HIERARCHY: Record<string, RoleKey[]> = {
	viewer: ["all", "viewer"],
	staff: ["all", "viewer", "staff"],
	admin: ["all", "viewer", "staff", "admin"],
	editor: ["all", "viewer", "staff", "editor"],
};

export const useUserRoles = (): RoleKey[] => {
	const ctx = useContext(ConferenceCtx);

	const isEditor = ctx?.isEditor ?? false;
	const role = ctx?.role ?? null;
	const { data } = neon.auth.useSession();

	if (!data?.user || !isEditor) return ["all", "viewer"];

	const userRole = (role || "editor") as keyof typeof ROLE_HIERARCHY;
	return ROLE_HIERARCHY[userRole] || ROLE_HIERARCHY.editor;
};
