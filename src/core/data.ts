import { NAVIGATION_GROUPS } from "@/core/navigationGroups";
import type { NavGroup, PageMeta } from "@/core/types";

type SectionKey =
	| "meta"
	| "overview"
	| "categoryBreakdown"
	| "dailyCheckIn"
	| "attendees"
	| "travelArrivals"
	| "travelModes"
	| "accommodation"
	| "food"
	| "schedule"
	| "vip"
	| "logistics"
	| "venues"
	| "volunteers"
	| "issues"
	| "finance";

export interface ConferenceData {
	meta: {
		name: string;
		shortName: string;
		dates: string;
		venue: string;
		currentDay: number;
	};
	overview: {
		total: number;
		confirmed: number;
		checkedIn: number;
		pending: number;
		vip: number;
		roomsAssigned: number;
		roomsTotal: number;
		mealCountToday: number;
		pendingTravel: number;
		openIssues: number;
	};
	categoryBreakdown: Array<{ name: string; value: number; color: string }>;
	dailyCheckIn: Array<{ day: string; registered: number; checkedIn: number; food: number }>;
	attendees: Array<{
		id: string;
		name: string;
		institution: string;
		city: string;
		state: string;
		category: string;
		status: string;
		travel: string;
	}>;
	travelArrivals: Array<{
		name: string;
		from: string;
		mode: string;
		time: string;
		pickup: string;
		vehicle: string;
		status: string;
	}>;
	travelModes: Array<{ name: string; count: number }>;
	accommodation: {
		summary: Array<{ type: string; total: number; occupied: number }>;
		issues: Array<{ room: string; issue: string; priority: string; status: string }>;
	};
	food: {
		daywise: Array<{
			day: string;
			breakfast: number;
			lunch: number;
			tea: number;
			dinner: number;
		}>;
		diets: Array<{ name: string; value: number; color: string }>;
	};
	schedule: Array<{
		label: string;
		sessions: Array<{
			time: string;
			title: string;
			speaker: string;
			venue: string;
			type: string;
			status: string;
		}>;
	}>;
	vip: {
		guests: Array<{
			name: string;
			designation: string;
			protocol: string;
			arrival: string;
			vehicle: string;
			security: boolean;
			speech: boolean;
			status: string;
		}>;
		checklist: Array<{ item: string; done: boolean }>;
	};
	logistics: Array<{ item: string; total: number; issued: number; vendor: string }>;
	venues: Array<{
		name: string;
		capacity: number;
		status: string;
		projector: boolean;
		mic: boolean;
		ac: boolean;
	}>;
	volunteers: Array<{
		name: string;
		role: string;
		location: string;
		shift: string;
		team: string;
		status: string;
	}>;
	issues: Array<{
		id: string;
		name: string;
		type: string;
		priority: string;
		assigned: string;
		status: string;
		age: string;
	}>;
	finance: {
		summary: { budget: number; spent: number; income: number };
		breakdown: Array<{
			name: string;
			budget: number;
			actual: number;
			type: "income" | "expense";
		}>;
	};
}

const dataSections: Pick<ConferenceData, SectionKey> = {
	meta: {
		name: "National Conference on Operationalising NEP 2020: Integrating Indian Knowledge System",
		shortName: "NCO-NEP",
		dates: "24-28 June 2026",
		venue: "Sri Sri Ravishankar Ashram, Bengaluru",
		currentDay: 2,
	},
	overview: {
		total: 500,
		confirmed: 463,
		checkedIn: 372,
		pending: 37,
		vip: 40,
		roomsAssigned: 480,
		roomsTotal: 500,
		mealCountToday: 500,
		pendingTravel: 62,
		openIssues: 7,
	},
	categoryBreakdown: [
		{ name: "Students", value: 180, color: "#60a5fa" },
		{ name: "Faculty", value: 120, color: "#a78bfa" },
		{ name: "Industry", value: 85, color: "#fb923c" },
		{ name: "Speakers", value: 35, color: "#34d399" },
		{ name: "VIP", value: 40, color: "#d4af37" },
		{ name: "Organizers", value: 40, color: "#f472b6" },
	],
	dailyCheckIn: [
		{ day: "Day 1", registered: 500, checkedIn: 320, food: 480 },
		{ day: "Day 2", registered: 500, checkedIn: 372, food: 500 },
		{ day: "Day 3", registered: 500, checkedIn: 0, food: 0 },
	],
	attendees: [
		{
			id: "NRS001",
			name: "Dr. Anita Sharma",
			institution: "IISc",
			city: "Bengaluru",
			state: "Karnataka",
			category: "Speaker",
			status: "Checked In",
			travel: "Flight",
		},
		{
			id: "NRS002",
			name: "Prof. Rajesh Kumar",
			institution: "IIT Delhi",
			city: "New Delhi",
			state: "Delhi",
			category: "VIP",
			status: "Checked In",
			travel: "Flight",
		},
		{
			id: "NRS003",
			name: "Priya Menon",
			institution: "TIFR",
			city: "Mumbai",
			state: "Maharashtra",
			category: "Student",
			status: "Checked In",
			travel: "Train",
		},
		{
			id: "NRS004",
			name: "Arjun Verma",
			institution: "NIT Trichy",
			city: "Trichy",
			state: "Tamil Nadu",
			category: "Student",
			status: "Not Checked In",
			travel: "Bus",
		},
		{
			id: "NRS005",
			name: "Dr. Sunita Rao",
			institution: "DRDO",
			city: "Hyderabad",
			state: "Telangana",
			category: "Industry",
			status: "Checked In",
			travel: "Car",
		},
		{
			id: "NRS006",
			name: "Rahul Nair",
			institution: "Univ. of Kerala",
			city: "Trivandrum",
			state: "Kerala",
			category: "Faculty",
			status: "Not Checked In",
			travel: "Train",
		},
		{
			id: "NRS007",
			name: "Dr. Meera Pillai",
			institution: "ISRO",
			city: "Bengaluru",
			state: "Karnataka",
			category: "Industry",
			status: "Checked In",
			travel: "Car",
		},
		{
			id: "NRS008",
			name: "Karthik S.",
			institution: "Anna University",
			city: "Chennai",
			state: "Tamil Nadu",
			category: "Student",
			status: "Checked In",
			travel: "Train",
		},
		{
			id: "NRS009",
			name: "Dr. Vineeta Singh",
			institution: "AIIMS",
			city: "New Delhi",
			state: "Delhi",
			category: "Speaker",
			status: "Not Checked In",
			travel: "Flight",
		},
		{
			id: "NRS010",
			name: "Amit Patel",
			institution: "IIM Ahmedabad",
			city: "Ahmedabad",
			state: "Gujarat",
			category: "Industry",
			status: "Checked In",
			travel: "Flight",
		},
		{
			id: "NRS011",
			name: "Prof. Lakshmi Devi",
			institution: "Andhra Univ.",
			city: "Vizag",
			state: "Andhra Pradesh",
			category: "Faculty",
			status: "Checked In",
			travel: "Train",
		},
		{
			id: "NRS012",
			name: "Dr. Arun Mehta",
			institution: "Tata Institute",
			city: "Pune",
			state: "Maharashtra",
			category: "VIP",
			status: "Checked In",
			travel: "Car",
		},
	],
	travelArrivals: [
		{
			name: "Dr. Anita Sharma",
			from: "Kempegowda Airport",
			mode: "Flight",
			time: "08:30",
			pickup: "Yes",
			vehicle: "SUV-KA01",
			status: "Completed",
		},
		{
			name: "Prof. Rajesh Kumar",
			from: "Kempegowda Airport",
			mode: "Flight",
			time: "09:45",
			pickup: "Yes",
			vehicle: "VIP-Van-01",
			status: "Completed",
		},
		{
			name: "Priya Menon",
			from: "KSR Station",
			mode: "Train",
			time: "10:20",
			pickup: "Yes",
			vehicle: "Bus-02",
			status: "Completed",
		},
		{
			name: "Arjun Verma",
			from: "KSR Station",
			mode: "Train",
			time: "11:00",
			pickup: "No",
			vehicle: "-",
			status: "Pending",
		},
		{
			name: "Dr. Vineeta Singh",
			from: "Kempegowda Airport",
			mode: "Flight",
			time: "14:30",
			pickup: "Yes",
			vehicle: "SUV-KA03",
			status: "En Route",
		},
		{
			name: "Rahul Nair",
			from: "KSR Station",
			mode: "Train",
			time: "16:45",
			pickup: "Yes",
			vehicle: "Bus-04",
			status: "Scheduled",
		},
	],
	travelModes: [
		{ name: "Flight", count: 210 },
		{ name: "Train", count: 180 },
		{ name: "Bus", count: 70 },
		{ name: "Car/Taxi", count: 40 },
	],
	accommodation: {
		summary: [
			{ type: "Single", total: 80, occupied: 76 },
			{ type: "Double", total: 120, occupied: 118 },
			{ type: "Triple", total: 60, occupied: 58 },
			{ type: "Dormitory", total: 200, occupied: 192 },
			{ type: "VIP Suite", total: 20, occupied: 18 },
			{ type: "Guest House", total: 20, occupied: 18 },
		],
		issues: [
			{ room: "Room 204", issue: "AC not working", priority: "High", status: "In Progress" },
			{
				room: "Hostel B-12",
				issue: "Hot water issue",
				priority: "Medium",
				status: "Resolved",
			},
			{
				room: "Guest House 2",
				issue: "Extra bed request",
				priority: "Low",
				status: "Pending",
			},
		],
	},
	food: {
		daywise: [
			{ day: "Day 1", breakfast: 450, lunch: 500, tea: 500, dinner: 480 },
			{ day: "Day 2", breakfast: 500, lunch: 500, tea: 500, dinner: 500 },
			{ day: "Day 3 (VIP)", breakfast: 500, lunch: 550, tea: 550, dinner: 300 },
		],
		diets: [
			{ name: "Vegetarian", value: 320, color: "#34d399" },
			{ name: "Non-Veg", value: 130, color: "#f87171" },
			{ name: "Jain", value: 25, color: "#fbbf24" },
			{ name: "Vegan", value: 15, color: "#a78bfa" },
			{ name: "Special", value: 10, color: "#60a5fa" },
		],
	},
	schedule: [
		{
			label: "Day 1 - Dec 15",
			sessions: [
				{
					time: "09:00-10:30",
					title: "Inauguration & Opening Keynote",
					speaker: "Dr. Anita Sharma",
					venue: "Main Auditorium",
					type: "Keynote",
					status: "done",
				},
				{
					time: "10:30-11:00",
					title: "Tea Break",
					speaker: "-",
					venue: "Foyer",
					type: "Break",
					status: "done",
				},
				{
					time: "11:00-13:00",
					title: "Parallel Sessions - Track A & B",
					speaker: "Multiple Speakers",
					venue: "Hall A & B",
					type: "Parallel",
					status: "done",
				},
				{
					time: "13:00-14:00",
					title: "Lunch Break",
					speaker: "-",
					venue: "Dining Hall",
					type: "Break",
					status: "done",
				},
				{
					time: "14:00-16:00",
					title: "Workshop: Characterization Techniques",
					speaker: "Prof. Rajesh Kumar",
					venue: "Workshop Hall",
					type: "Workshop",
					status: "done",
				},
				{
					time: "16:30-18:00",
					title: "Panel Discussion: Industry-Academia",
					speaker: "Panel of 5",
					venue: "Main Auditorium",
					type: "Panel",
					status: "done",
				},
				{
					time: "19:00-21:00",
					title: "Welcome Dinner",
					speaker: "-",
					venue: "Dining Hall",
					type: "Social",
					status: "done",
				},
			],
		},
		{
			label: "Day 2 - Dec 16",
			sessions: [
				{
					time: "09:00-10:00",
					title: "Keynote: AI in Scientific Research",
					speaker: "Dr. Vineeta Singh",
					venue: "Main Auditorium",
					type: "Keynote",
					status: "ongoing",
				},
				{
					time: "10:00-10:30",
					title: "Tea Break",
					speaker: "-",
					venue: "Foyer",
					type: "Break",
					status: "upcoming",
				},
				{
					time: "10:30-12:30",
					title: "Parallel Sessions - Track C & D",
					speaker: "Multiple Speakers",
					venue: "Hall C & D",
					type: "Parallel",
					status: "upcoming",
				},
				{
					time: "12:30-13:30",
					title: "Lunch Break",
					speaker: "-",
					venue: "Dining Hall",
					type: "Break",
					status: "upcoming",
				},
				{
					time: "13:30-15:30",
					title: "Poster Presentation Session",
					speaker: "Student Participants",
					venue: "Exhibition Hall",
					type: "Poster",
					status: "upcoming",
				},
				{
					time: "16:00-18:00",
					title: "Invited Talks - Materials Characterization",
					speaker: "4 Speakers",
					venue: "Main Auditorium",
					type: "Invited",
					status: "upcoming",
				},
				{
					time: "19:00-22:00",
					title: "Cultural Evening",
					speaker: "-",
					venue: "Amphitheatre",
					type: "Social",
					status: "upcoming",
				},
			],
		},
		{
			label: "Day 3 - Dec 17 VIP Day",
			sessions: [
				{
					time: "09:00-10:00",
					title: "VIP Keynote: National Research Vision 2030",
					speaker: "Secretary, DST",
					venue: "Main Auditorium",
					type: "VIP",
					status: "upcoming",
				},
				{
					time: "10:00-11:00",
					title: "Keynote: Sustainable Materials",
					speaker: "Prof. Sunita Rao",
					venue: "Main Auditorium",
					type: "Keynote",
					status: "upcoming",
				},
				{
					time: "11:30-13:00",
					title: "Award Ceremony & Best Paper",
					speaker: "Organizing Committee",
					venue: "Main Auditorium",
					type: "Award",
					status: "upcoming",
				},
				{
					time: "13:00-14:30",
					title: "VIP Lunch",
					speaker: "-",
					venue: "VIP Dining Hall",
					type: "VIP",
					status: "upcoming",
				},
				{
					time: "14:30-16:00",
					title: "Valedictory Function",
					speaker: "Chief Guest",
					venue: "Main Auditorium",
					type: "Plenary",
					status: "upcoming",
				},
				{
					time: "16:00-16:30",
					title: "High Tea & Farewell",
					speaker: "-",
					venue: "Foyer",
					type: "Break",
					status: "upcoming",
				},
			],
		},
	],
	vip: {
		guests: [
			{
				name: "Hon. Rajendra Prasad",
				designation: "Secretary, DST",
				protocol: "A+",
				arrival: "09:00",
				vehicle: "VIP-01",
				security: true,
				speech: true,
				status: "Confirmed",
			},
			{
				name: "Prof. K. Venkataraman",
				designation: "Director, IISc",
				protocol: "A",
				arrival: "09:30",
				vehicle: "VIP-02",
				security: true,
				speech: false,
				status: "Confirmed",
			},
			{
				name: "Dr. Mehta Arun",
				designation: "CMD, Tata Institute",
				protocol: "B",
				arrival: "10:00",
				vehicle: "VIP-03",
				security: false,
				speech: true,
				status: "Confirmed",
			},
			{
				name: "Prof. Lakshmi Devi",
				designation: "President, MRSI",
				protocol: "B",
				arrival: "08:45",
				vehicle: "VIP-04",
				security: false,
				speech: true,
				status: "Pending",
			},
		],
		checklist: [
			{ item: "Invitations sent", done: true },
			{ item: "Confirmations received", done: true },
			{ item: "Travel arrangements made", done: true },
			{ item: "Accommodation confirmed", done: true },
			{ item: "Security clearance obtained", done: false },
			{ item: "Stage seating finalized", done: false },
			{ item: "Nameplates prepared", done: false },
			{ item: "Mementos procured", done: true },
			{ item: "Green room allocated", done: true },
			{ item: "Food arrangement confirmed", done: true },
			{ item: "Media briefing scheduled", done: false },
			{ item: "Escort briefed", done: false },
		],
	},
	logistics: [
		{ item: "Conference Kits", total: 520, issued: 372, vendor: "Print Masters" },
		{ item: "ID Cards & Lanyards", total: 520, issued: 372, vendor: "Print Masters" },
		{ item: "Tote Bags", total: 510, issued: 370, vendor: "Textile Hub" },
		{ item: "Notebooks", total: 510, issued: 372, vendor: "Stationery Co." },
		{ item: "Mementos", total: 60, issued: 5, vendor: "Craft Works" },
		{ item: "Certificates", total: 450, issued: 0, vendor: "Print Masters" },
		{ item: "Banners (2m×4m)", total: 24, issued: 24, vendor: "Banner Print" },
		{ item: "Water Bottles (500ml)", total: 2000, issued: 850, vendor: "Aqua Fresh" },
		{ item: "Walkie-Talkies", total: 20, issued: 18, vendor: "Comms Solutions" },
	],
	venues: [
		{
			name: "Main Auditorium",
			capacity: 600,
			status: "Active",
			projector: true,
			mic: true,
			ac: true,
		},
		{ name: "Hall A", capacity: 120, status: "Active", projector: true, mic: true, ac: true },
		{ name: "Hall B", capacity: 120, status: "Active", projector: true, mic: true, ac: true },
		{ name: "Hall C", capacity: 100, status: "Active", projector: true, mic: false, ac: true },
		{ name: "Hall D", capacity: 100, status: "Issue", projector: false, mic: true, ac: true },
		{
			name: "Workshop Hall",
			capacity: 80,
			status: "Active",
			projector: true,
			mic: true,
			ac: true,
		},
		{
			name: "Exhibition Hall",
			capacity: 200,
			status: "Active",
			projector: false,
			mic: false,
			ac: true,
		},
		{
			name: "VIP Lounge",
			capacity: 30,
			status: "Active",
			projector: true,
			mic: true,
			ac: true,
		},
	],
	volunteers: [
		{
			name: "Deepak Kumar",
			role: "Registration Head",
			location: "Entry Gate",
			shift: "8am-2pm",
			team: "Registration",
			status: "Active",
		},
		{
			name: "Sneha Patel",
			role: "VIP Protocol",
			location: "VIP Lounge",
			shift: "All Day",
			team: "VIP",
			status: "Active",
		},
		{
			name: "Rahul Singh",
			role: "AV Technical Support",
			location: "Main Auditorium",
			shift: "8am-6pm",
			team: "Technical",
			status: "Active",
		},
		{
			name: "Ananya Reddy",
			role: "Transport Coordinator",
			location: "Main Gate",
			shift: "7am-8pm",
			team: "Transport",
			status: "Active",
		},
		{
			name: "Vijay Kumar",
			role: "Food & Catering",
			location: "Dining Hall",
			shift: "9am-9pm",
			team: "Food",
			status: "Active",
		},
		{
			name: "Pooja Iyer",
			role: "Accommodation Desk",
			location: "Check-in Counter",
			shift: "8am-8pm",
			team: "Accommodation",
			status: "On Break",
		},
		{
			name: "Aditya Sharma",
			role: "Medical/Helpdesk",
			location: "Help Kiosk",
			shift: "All Day",
			team: "Helpdesk",
			status: "Active",
		},
		{
			name: "Kavya Nair",
			role: "Stage Management",
			location: "Backstage",
			shift: "8am-6pm",
			team: "Programme",
			status: "Active",
		},
	],
	issues: [
		{
			id: "ISS001",
			name: "Dr. Vineeta Singh",
			type: "Transport Delay",
			priority: "High",
			assigned: "Transport Team",
			status: "Open",
			age: "1h ago",
		},
		{
			id: "ISS002",
			name: "Arjun Verma",
			type: "Badge Issue",
			priority: "Medium",
			assigned: "Registration",
			status: "In Progress",
			age: "2h ago",
		},
		{
			id: "ISS003",
			name: "Priya Menon",
			type: "Room Problem",
			priority: "High",
			assigned: "Accommodation",
			status: "Resolved",
			age: "3h ago",
		},
		{
			id: "ISS004",
			name: "Rahul Nair",
			type: "Food Preference",
			priority: "Low",
			assigned: "Catering",
			status: "Open",
			age: "30m ago",
		},
		{
			id: "ISS005",
			name: "Unknown",
			type: "Lost Item",
			priority: "Medium",
			assigned: "Security",
			status: "In Progress",
			age: "45m ago",
		},
		{
			id: "ISS006",
			name: "Prof. Rajesh Kumar",
			type: "VIP Protocol",
			priority: "High",
			assigned: "VIP Desk",
			status: "Resolved",
			age: "4h ago",
		},
		{
			id: "ISS007",
			name: "Karthik S.",
			type: "AV Technical",
			priority: "High",
			assigned: "AV Team",
			status: "Open",
			age: "15m ago",
		},
	],
	finance: {
		summary: { budget: 2800000, spent: 1950000, income: 850000 },
		breakdown: [
			{ name: "Registration", budget: 500000, actual: 480000, type: "income" },
			{ name: "Sponsorship", budget: 600000, actual: 370000, type: "income" },
			{ name: "Accommodation", budget: 400000, actual: 385000, type: "expense" },
			{ name: "Food", budget: 500000, actual: 492000, type: "expense" },
			{ name: "Transport", budget: 200000, actual: 185000, type: "expense" },
			{ name: "Printing", budget: 150000, actual: 142000, type: "expense" },
			{ name: "Venue & AV", budget: 300000, actual: 275000, type: "expense" },
			{ name: "VIP Event", budget: 250000, actual: 190000, type: "expense" },
			{ name: "Misc.", budget: 100000, actual: 81000, type: "expense" },
		],
	},
};

export const DATA: ConferenceData = dataSections as ConferenceData;
export const INITIAL_DATA: ConferenceData = DATA;

export const DATA_SECTIONS = dataSections;

export const NAV_GROUPS: NavGroup[] = NAVIGATION_GROUPS;

export const PAGES_META: PageMeta[] = NAV_GROUPS.flatMap(group =>
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

export const buildConferenceData = (overrides: Partial<ConferenceData> = {}): ConferenceData => ({
	...DATA,
	...overrides,
	meta: { ...DATA.meta, ...overrides.meta },
	overview: { ...DATA.overview, ...overrides.overview },
	accommodation: { ...DATA.accommodation, ...overrides.accommodation },
	food: { ...DATA.food, ...overrides.food },
	vip: { ...DATA.vip, ...overrides.vip },
	finance: { ...DATA.finance, ...overrides.finance },
});

export const fetchData = async (): Promise<ConferenceData> => Promise.resolve(DATA);
export const getDataSync = () => DATA;

export const DATA_API = {
	buildConferenceData,
	fetchData,
	getDataSync,
	INITIAL_DATA,
	DATA_SECTIONS,
};
const DATA_API_TOUCH = [DATA_API.buildConferenceData, DATA_API.fetchData, DATA_API.getDataSync];
void DATA_API_TOUCH;
