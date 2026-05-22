export type DefaultCommittee = {
	slug: string;
	name: string;
	description: string;
	icon: string;
	color: string;
};

export const DEFAULT_COMMITTEES: DefaultCommittee[] = [
	{
		slug: "transportation",
		name: "Transportation",
		description:
			"Vehicle pool, arrival/departure pickups, internal shuttles, and driver coordination.",
		icon: "Bus",
		color: "blue",
	},
	{
		slug: "accommodation",
		name: "Accommodation",
		description: "Room blocks, check-in/check-out, key management, and fault tickets.",
		icon: "BedDouble",
		color: "indigo",
	},
	{
		slug: "registration",
		name: "Registration",
		description: "On-site registration desk, badge printing, kit handout, attendee directory.",
		icon: "ClipboardList",
		color: "emerald",
	},
	{
		slug: "food-dining",
		name: "Food & Dining",
		description: "Daily meal plans, dietary preferences, meal scanning, caterer liaison.",
		icon: "Utensils",
		color: "amber",
	},
	{
		slug: "technical-stage",
		name: "Technical / Stage",
		description: "Stage setup, lighting, mic checks, presentation laptops, transitions.",
		icon: "Mic2",
		color: "purple",
	},
	{
		slug: "anchoring",
		name: "Anchoring",
		description: "Master of ceremonies, session anchors, script and announcement coordination.",
		icon: "MessageSquare",
		color: "pink",
	},
	{
		slug: "program-coordinator",
		name: "Program Coordinator",
		description:
			"Overall schedule oversight, session-to-session handovers, speaker green room.",
		icon: "CalendarClock",
		color: "violet",
	},
	{
		slug: "vyavastha-resource-mobilization",
		name: "Vyavastha (Resource Mobilization)",
		description:
			"General arrangements and procurement of resources and consumables across the event.",
		icon: "Boxes",
		color: "orange",
	},
	{
		slug: "safety-medical",
		name: "Safety & Medical",
		description:
			"First aid, ambulance liaison, fire safety, emergency procedures, security coordination.",
		icon: "HeartPulse",
		color: "red",
	},
	{
		slug: "central-coordination",
		name: "Central Coordination",
		description: "Cross-committee coordination, escalation point, leadership liaison.",
		icon: "Network",
		color: "slate",
	},
	{
		slug: "publicity",
		name: "Publicity & Outreach",
		description: "Pre-event awareness, press releases, social media buzz, sign-ups.",
		icon: "Megaphone",
		color: "rose",
	},
	{
		slug: "publication",
		name: "Publication",
		description: "Souvenir, programme book, abstracts compilation, proceedings.",
		icon: "BookOpen",
		color: "cyan",
	},
	{
		slug: "banner-print",
		name: "Banner & Print",
		description: "Signage, standees, flex banners, route signs, printed materials production.",
		icon: "Printer",
		color: "yellow",
	},
	{
		slug: "keynote-program",
		name: "Keynote Program",
		description: "Keynote speakers, invitations, travel, accommodation, on-stage protocol.",
		icon: "Star",
		color: "amber",
	},
	{
		slug: "cultural-activities",
		name: "Cultural Activities",
		description: "Cultural performances, evening programmes, entertainment liaison.",
		icon: "Music",
		color: "fuchsia",
	},
	{
		slug: "photography-social-media",
		name: "Photography & Social Media",
		description: "Event photography, videography, live social-media updates, content archive.",
		icon: "Camera",
		color: "sky",
	},
	{
		slug: "venue-infrastructure",
		name: "Venue & Infrastructure",
		description: "Halls, seating, electricity, water, cleanliness, civil readiness.",
		icon: "Building2",
		color: "stone",
	},
	{
		slug: "audio-visual-it",
		name: "Audio Visual / IT",
		description: "AV equipment, networking, Wi-Fi, livestreaming, recording, IT helpdesk.",
		icon: "MonitorPlay",
		color: "teal",
	},
	{
		slug: "finance-sponsorship",
		name: "Finance & Sponsorship",
		description: "Budgeting, expenses, sponsor outreach, MoUs, invoice tracking.",
		icon: "Wallet",
		color: "green",
	},
	{
		slug: "daily-control-system",
		name: "Daily Control System",
		description: "Per-day operations dashboard, shift handover, status snapshots.",
		icon: "Activity",
		color: "blue",
	},
	{
		slug: "control-room",
		name: "Control Room",
		description:
			"Live command centre: incidents, helpdesk, escalations, inter-committee communication.",
		icon: "Radio",
		color: "red",
	},
];

export const DEFAULT_CUSTOM_FIELDS: {
	entity: "attendees" | "staff" | "sessions" | "speakers" | "vip_guests";
	fieldKey: string;
	fieldLabel: string;
	fieldType:
		| "text"
		| "textarea"
		| "number"
		| "date"
		| "datetime"
		| "select"
		| "multiselect"
		| "checkbox"
		| "email"
		| "phone"
		| "url";
	isRequired?: boolean;
	isVisibleInList?: boolean;
	isSearchable?: boolean;
	helpText?: string;
	options?: { value: string; label: string }[];
	groupName?: string;
	sortOrder?: number;
}[] = [
	{
		entity: "attendees",
		fieldKey: "t_shirt_size",
		fieldLabel: "T-Shirt Size",
		fieldType: "select",
		options: [
			{ value: "xs", label: "XS" },
			{ value: "s", label: "S" },
			{ value: "m", label: "M" },
			{ value: "l", label: "L" },
			{ value: "xl", label: "XL" },
			{ value: "xxl", label: "XXL" },
		],
		groupName: "Logistics",
		sortOrder: 10,
	},
	{
		entity: "attendees",
		fieldKey: "needs_invitation_letter",
		fieldLabel: "Needs Invitation Letter (Visa)",
		fieldType: "checkbox",
		groupName: "Travel",
		sortOrder: 20,
	},
];
