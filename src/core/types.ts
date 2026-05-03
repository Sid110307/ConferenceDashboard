import type { LucideIcon } from "lucide-react";

export type RoleKey = string;

export interface NavItem {
	id: string;
	label: string;
	icon: LucideIcon;
	roles?: RoleKey[];
	ariaLabel?: string;
}

export interface NavGroup {
	label: string | null;
	items: NavItem[];
}

export interface PageMeta {
	id: string;
	label: string;
	description?: string;
	group?: string | null;
	roles?: RoleKey[];
}
