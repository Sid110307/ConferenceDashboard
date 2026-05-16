import {
	Bed,
	Building2,
	Calendar,
	Crown,
	Download,
	Headphones,
	LayoutDashboard,
	MessageSquare,
	Package,
	Plane,
	QrCode,
	Receipt,
	Settings,
	UserCheck,
	Users,
	Utensils,
} from "lucide-react";

import type { NavGroup } from "@/core/types";

export const DASHBOARD_GROUP: NavGroup = {
	label: null,
	items: [
		{
			id: "dashboard",
			label: "Dashboard",
			icon: LayoutDashboard,
			roles: ["all"],
			ariaLabel: "Open dashboard",
		},
	],
};

export const PARTICIPANTS_GROUP: NavGroup = {
	label: "Participants",
	items: [
		{
			id: "attendees",
			label: "Attendees",
			icon: Users,
			roles: ["all"],
			ariaLabel: "Manage attendees",
		},
		{
			id: "checkin",
			label: "Check-in & Badges",
			icon: QrCode,
			roles: ["staff", "admin"],
			ariaLabel: "Check-in and badge printing",
		},
		{
			id: "feedback",
			label: "Feedback & Certs",
			icon: MessageSquare,
			roles: ["staff", "admin"],
			ariaLabel: "Feedback and certificate management",
		},
	],
};

export const HOSPITALITY_GROUP: NavGroup = {
	label: "Hospitality",
	items: [
		{
			id: "travel",
			label: "Travel",
			icon: Plane,
			roles: ["staff", "admin"],
			ariaLabel: "Travel arrivals and pickups",
		},
		{
			id: "accommodation",
			label: "Accommodation",
			icon: Bed,
			roles: ["staff", "admin"],
			ariaLabel: "Accommodation management",
		},
		{
			id: "food",
			label: "Food & Catering",
			icon: Utensils,
			roles: ["staff", "admin"],
			ariaLabel: "Food and catering",
		},
	],
};

export const PROGRAMME_GROUP: NavGroup = {
	label: "Programme",
	items: [
		{
			id: "schedule",
			label: "Schedule",
			icon: Calendar,
			roles: ["all"],
			ariaLabel: "Programme schedule",
		},
		{
			id: "vip",
			label: "VIP Event",
			icon: Crown,
			roles: ["staff", "admin"],
			ariaLabel: "VIP event management",
		},
	],
};

export const OPERATIONS_GROUP: NavGroup = {
	label: "Operations",
	items: [
		{
			id: "logistics",
			label: "Logistics",
			icon: Package,
			roles: ["staff", "admin"],
			ariaLabel: "Logistics and inventory",
		},
		{
			id: "venue",
			label: "Venue & Halls",
			icon: Building2,
			roles: ["staff", "admin"],
			ariaLabel: "Venue and halls",
		},
		{
			id: "volunteers",
			label: "Volunteers",
			icon: UserCheck,
			roles: ["staff", "admin"],
			ariaLabel: "Volunteer management",
		},
		{
			id: "helpdesk",
			label: "Helpdesk",
			icon: Headphones,
			roles: ["staff", "admin"],
			ariaLabel: "Helpdesk and issues",
		},
	],
};

export const ADMINISTRATION_GROUP: NavGroup = {
	label: "Administration",
	items: [
		{
			id: "finance",
			label: "Finance",
			icon: Receipt,
			roles: ["staff", "admin"],
			ariaLabel: "Finance and budget",
		},
		{
			id: "reports",
			label: "Reports & Export",
			icon: Download,
			roles: ["admin"],
			ariaLabel: "Generate reports and exports",
		},
		{
			id: "settings",
			label: "Settings",
			icon: Settings,
			roles: ["admin"],
			ariaLabel: "Application settings",
		},
	],
};

export const NAVIGATION_GROUPS: NavGroup[] = [
	DASHBOARD_GROUP,
	PARTICIPANTS_GROUP,
	HOSPITALITY_GROUP,
	PROGRAMME_GROUP,
	OPERATIONS_GROUP,
	ADMINISTRATION_GROUP,
];
