import type { RoleKey } from "@/core/types";

export const currentUserRoles: RoleKey[] = ["all", "staff"];

export const hasAccess = (userRoles: RoleKey[], required?: RoleKey[]): boolean => {
	if (!required || required.length === 0) return true;
	if (required.includes("all")) return true;
	return required.some(r => userRoles.includes(r));
};

export const getUserRoles = (): RoleKey[] => currentUserRoles;
