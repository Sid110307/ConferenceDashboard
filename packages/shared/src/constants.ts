export const USER_ROLES = ["super_admin", "admin", "editor", "viewer"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const ROLE_HIERARCHY: Record<UserRole, number> = {
	viewer: 1,
	editor: 2,
	admin: 3,
	super_admin: 4,
};

export function hasAtLeastRole(role: UserRole, required: UserRole): boolean {
	return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[required];
}

export const ROLE_LABELS: Record<UserRole, string> = {
	viewer: "Viewer",
	editor: "Editor",
	admin: "Admin",
	super_admin: "Super Admin",
};

export const ATTENDEE_CATEGORIES = [
	"student",
	"faculty",
	"industry",
	"speaker",
	"vip",
	"organizer",
	"guest",
	"sponsor",
	"media",
	"other",
] as const;
export type AttendeeCategory = (typeof ATTENDEE_CATEGORIES)[number];

export const GENDERS = ["male", "female", "other", "prefer_not_to_say"] as const;
export type Gender = (typeof GENDERS)[number];

export const DIET_PREFERENCES = [
	"vegetarian",
	"non_veg",
	"vegan",
	"jain",
	"special",
	"none",
] as const;
export type DietPreference = (typeof DIET_PREFERENCES)[number];

export const TRAVEL_MODES = [
	"flight",
	"train",
	"bus",
	"car",
	"taxi",
	"local",
	"other",
] as const;
export type TravelMode = (typeof TRAVEL_MODES)[number];

export const TRAVEL_DIRECTIONS = ["arrival", "departure"] as const;
export type TravelDirection = (typeof TRAVEL_DIRECTIONS)[number];

export const PICKUP_STATUSES = [
	"not_required",
	"scheduled",
	"en_route",
	"completed",
	"delayed",
	"cancelled",
] as const;
export type PickupStatus = (typeof PICKUP_STATUSES)[number];

export const ROOM_TYPES = [
	"single",
	"double",
	"triple",
	"quad",
	"dorm",
	"suite",
	"vip_suite",
] as const;
export type RoomType = (typeof ROOM_TYPES)[number];

export const ALLOCATION_STATUSES = [
	"pending",
	"checked_in",
	"checked_out",
	"cancelled",
	"no_show",
] as const;
export type AllocationStatus = (typeof ALLOCATION_STATUSES)[number];

export const COMMS_CHANNELS = ["email", "sms", "whatsapp"] as const;
export type CommsChannel = (typeof COMMS_CHANNELS)[number];

export const COMMS_PROVIDERS = [
	"resend",
	"sendgrid",
	"smtp",
	"msg91",
	"twilio_sms",
	"meta_wa",
	"twilio_wa",
] as const;
export type CommsProvider = (typeof COMMS_PROVIDERS)[number];

export const CUSTOM_FIELD_TYPES = [
	"text",
	"textarea",
	"number",
	"date",
	"datetime",
	"select",
	"multiselect",
	"checkbox",
	"email",
	"phone",
	"url",
] as const;
export type CustomFieldType = (typeof CUSTOM_FIELD_TYPES)[number];

export const CUSTOM_FIELD_ENTITIES = [
	"conferences",
	"attendees",
	"staff",
	"sessions",
	"speakers",
	"sponsors",
	"vehicles",
	"accommodation_rooms",
	"travel_segments",
	"vip_guests",
	"finance_items",
	"helpdesk_issues",
] as const;
export type CustomFieldEntity = (typeof CUSTOM_FIELD_ENTITIES)[number];

export const IMPORT_ENTITIES = [
	"attendees",
	"staff",
	"committee_assignments",
	"sessions",
	"speakers",
	"sponsors",
	"travel_segments",
	"accommodation_rooms",
	"room_allocations",
	"finance_items",
] as const;
export type ImportEntity = (typeof IMPORT_ENTITIES)[number];

export const LIMITS = {
	IMPORT_MAX_ROWS: 50000,
	IMPORT_PREVIEW_ROWS: 20,
	IMPORT_BATCH_SIZE: 500,
	BULK_EMAIL_DEFAULT_RPS: 10,
	BULK_SMS_DEFAULT_RPS: 5,
	BULK_WHATSAPP_DEFAULT_RPS: 5,
	MAX_AUDIENCE_PER_CAMPAIGN: 50000,
	MAX_RECIPIENTS_PER_BATCH: 200,
	MAX_FILE_BYTES: 50 * 1024 * 1024,
	MAX_PHOTO_BYTES: 5 * 1024 * 1024,
	PAGE_SIZE_DEFAULT: 25,
	PAGE_SIZE_MAX: 200,
} as const;

export type Paginated<T> = {
	data: T[];
	pagination: {
		page: number;
		pageSize: number;
		total: number;
		totalPages: number;
		hasNextPage: boolean;
	};
};

export type ApiError = {
	error: string;
	message: string;
	details?: Record<string, unknown>;
};
