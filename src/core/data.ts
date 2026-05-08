import { NAVIGATION_GROUPS } from "@/core/navigationGroups";
import type { PageMeta } from "@/core/types";

export const PAGES_META: PageMeta[] = NAVIGATION_GROUPS.flatMap(group =>
	group.items.map(item => ({
		id: item.id,
		label: item.label,
		description: item.ariaLabel || "",
		group: group.label,
		roles: item.roles,
	})),
);

const CATEGORY_VARIANTS = {
	Student: "blue",
	Faculty: "purple",
	Industry: "orange",
	Speaker: "green",
	VIP: "gold",
	Organizer: "pink",
} as const;

const STATUS_VARIANTS = {
	"Checked In": "green",
	"Not Checked In": "gray",
	"Completed": "green",
	"ongoing": "blue",
	"upcoming": "gray",
	"done": "green",
	"Open": "red",
	"In Progress": "yellow",
	"Resolved": "green",
	"Confirmed": "green",
	"Pending": "yellow",
	"En Route": "blue",
	"Scheduled": "gray",
	"Active": "green",
	"On Break": "yellow",
	"Issue": "red",
} as const;

export const categoryVariant = (category: string): string =>
	CATEGORY_VARIANTS[category as keyof typeof CATEGORY_VARIANTS] || "gray";

export const statusVariant = (status: string): string =>
	STATUS_VARIANTS[status as keyof typeof STATUS_VARIANTS] || "gray";

export const VARIANTS: Record<string, string> = {
	blue: "bg-blue-50 text-blue-700 border-blue-200",
	green: "bg-green-50 text-green-700 border-green-200",
	yellow: "bg-amber-50 text-amber-700 border-amber-200",
	red: "bg-red-50 text-red-700 border-red-200",
	purple: "bg-purple-50 text-purple-700 border-purple-200",
	orange: "bg-orange-50 text-orange-700 border-orange-200",
	gold: "bg-yellow-50 text-yellow-700 border-yellow-200",
	pink: "bg-pink-50 text-pink-700 border-pink-200",
	gray: "bg-gray-50 text-zinc-700 border-gray-200",
};

export const ICON_COLORS: Record<string, string> = {
	blue: "text-blue-600 bg-blue-50",
	green: "text-green-600 bg-green-50",
	yellow: "text-amber-600 bg-amber-50",
	red: "text-red-600 bg-red-50",
	purple: "text-purple-600 bg-purple-50",
	gold: "text-yellow-600 bg-yellow-50",
	orange: "text-orange-600 bg-orange-50",
	gray: "text-zinc-600 bg-gray-50",
};
