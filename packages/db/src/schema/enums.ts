import { pgEnum } from "drizzle-orm/pg-core";

export const userRoleEnum = pgEnum("user_role", ["super_admin", "admin", "editor", "viewer"]);

export const auditActionEnum = pgEnum("audit_action", [
	"create",
	"update",
	"delete",
	"restore",
	"purge",
	"login",
	"logout",
	"invite",
	"accept_invite",
	"export",
	"import",
	"send_campaign",
	"role_change",
]);

export const conferenceStatusEnum = pgEnum("conference_status", [
	"draft",
	"active",
	"concluded",
	"archived",
]);

export const publicStatusEnum = pgEnum("public_status", ["draft", "published", "archived"]);

export const genderEnum = pgEnum("gender", ["male", "female", "other", "prefer_not_to_say"]);

export const staffStatusEnum = pgEnum("staff_status", [
	"active",
	"inactive",
	"on_break",
	"completed",
]);

export const attendeeCategoryEnum = pgEnum("attendee_category", [
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
]);

export const registrationStatusEnum = pgEnum("registration_status", [
	"registered",
	"confirmed",
	"cancelled",
	"waitlisted",
	"no_show",
]);

export const checkinStatusEnum = pgEnum("checkin_status", [
	"not_checked_in",
	"checked_in",
	"checked_out",
]);

export const dietPreferenceEnum = pgEnum("diet_preference", [
	"vegetarian",
	"non_veg",
	"vegan",
	"jain",
	"special",
	"none",
]);

export const travelModeEnum = pgEnum("travel_mode", [
	"flight",
	"train",
	"bus",
	"car",
	"taxi",
	"local",
	"other",
]);

export const travelDirectionEnum = pgEnum("travel_direction", ["arrival", "departure"]);

export const travelStatusEnum = pgEnum("travel_status", [
	"planned",
	"in_transit",
	"arrived",
	"delayed",
	"cancelled",
]);

export const pickupStatusEnum = pgEnum("pickup_status", [
	"not_required",
	"scheduled",
	"en_route",
	"completed",
	"delayed",
	"cancelled",
]);

export const vehicleStatusEnum = pgEnum("vehicle_status", [
	"available",
	"in_use",
	"maintenance",
	"unavailable",
]);

export const roomTypeEnum = pgEnum("room_type", [
	"single",
	"double",
	"triple",
	"quad",
	"dorm",
	"suite",
	"vip_suite",
]);

export const roomStatusEnum = pgEnum("room_status", [
	"available",
	"occupied",
	"reserved",
	"maintenance",
	"blocked",
]);

export const genderPreferenceEnum = pgEnum("gender_preference", [
	"male",
	"female",
	"mixed",
	"none",
]);

export const allocationStatusEnum = pgEnum("allocation_status", [
	"pending",
	"checked_in",
	"checked_out",
	"cancelled",
	"no_show",
]);

export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "tea", "dinner", "snacks"]);

export const sessionTypeEnum = pgEnum("session_type", [
	"keynote",
	"invited",
	"panel",
	"workshop",
	"poster",
	"break",
	"social",
	"vip",
]);

export const sessionStatusEnum = pgEnum("session_status", [
	"upcoming",
	"ongoing",
	"done",
	"cancelled",
]);

export const sponsorTierEnum = pgEnum("sponsor_tier", [
	"title",
	"platinum",
	"gold",
	"silver",
	"bronze",
	"partner",
]);

export const priorityEnum = pgEnum("priority", ["low", "medium", "high", "urgent"]);

export const issueStatusEnum = pgEnum("issue_status", [
	"open",
	"in_progress",
	"resolved",
	"closed",
	"wont_fix",
]);

export const helpdeskCategoryEnum = pgEnum("helpdesk_category", [
	"transport",
	"accommodation",
	"food",
	"badge",
	"technical",
	"lost_item",
	"medical",
	"vip",
	"registration",
	"other",
]);

export const protocolLevelEnum = pgEnum("protocol_level", ["a_plus", "a", "b", "c", "none"]);

export const vipStatusEnum = pgEnum("vip_status", [
	"pending",
	"confirmed",
	"arrived",
	"completed",
	"cancelled",
]);

export const financeTypeEnum = pgEnum("finance_type", ["income", "expense"]);

export const financeCategoryEnum = pgEnum("finance_category", [
	"registration",
	"sponsorship",
	"accommodation",
	"food",
	"transport",
	"printing",
	"venue_av",
	"vip_event",
	"logistics",
	"honorarium",
	"misc",
]);

export const paymentStatusEnum = pgEnum("payment_status", [
	"pending",
	"partial",
	"paid",
	"received",
	"cancelled",
	"refunded",
]);

export const certificateTypeEnum = pgEnum("certificate_type", [
	"participation",
	"speaker",
	"volunteer",
	"organizer",
	"award",
]);

export const certificateStatusEnum = pgEnum("certificate_status", [
	"not_issued",
	"generated",
	"emailed",
	"printed",
	"revoked",
]);

export const commsChannelEnum = pgEnum("comms_channel", ["email", "sms", "whatsapp"]);

export const commsProviderEnum = pgEnum("comms_provider", [
	"resend",
	"sendgrid",
	"smtp",
	"msg91",
	"twilio_sms",
	"meta_wa",
	"twilio_wa",
]);

export const campaignStatusEnum = pgEnum("campaign_status", [
	"draft",
	"scheduled",
	"materialising",
	"sending",
	"completed",
	"completed_with_errors",
	"failed",
	"cancelled",
]);

export const recipientStatusEnum = pgEnum("recipient_status", [
	"pending",
	"queued",
	"sending",
	"sent",
	"delivered",
	"opened",
	"clicked",
	"failed",
	"bounced",
	"skipped",
]);

export const importStatusEnum = pgEnum("import_status", [
	"uploaded",
	"mapping",
	"previewing",
	"previewed",
	"importing",
	"completed",
	"with_errors",
	"failed",
	"rolling_back",
	"rolled_back",
	"cancelled",
]);

export const importRowStatusEnum = pgEnum("import_row_status", [
	"pending",
	"valid",
	"invalid",
	"duplicate",
	"imported",
	"skipped",
	"failed",
	"errored",
	"rolled_back",
]);

export const importEntityEnum = pgEnum("import_entity", [
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
]);

export const customFieldTypeEnum = pgEnum("custom_field_type", [
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
]);

export const customFieldEntityEnum = pgEnum("custom_field_entity", [
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
]);

export const reportFormatEnum = pgEnum("report_format", ["csv", "xlsx", "pdf", "json"]);

export const reportStatusEnum = pgEnum("report_status", [
	"pending",
	"generating",
	"completed",
	"failed",
	"cancelled",
]);

export const reportTypeEnum = pgEnum("report_type", [
	"attendee_master",
	"attendee_by_category",
	"travel_manifest_arrivals",
	"travel_manifest_departures",
	"travel_manifest_male",
	"travel_manifest_female",
	"accommodation_plan",
	"daily_control",
	"finance_summary",
	"food_counts",
	"committee_directory",
	"vip_report",
	"helpdesk_report",
	"custom",
]);

export const venueStatusEnum = pgEnum("venue_status", ["active", "inactive", "issue", "reserved"]);

export const logisticsCategoryEnum = pgEnum("logistics_category", [
	"kit",
	"printing",
	"av",
	"transport",
	"food",
	"venue",
	"certificate",
	"misc",
]);

export const logisticsStatusEnum = pgEnum("logistics_status", [
	"pending",
	"ordered",
	"received",
	"issued",
	"shortage",
	"cancelled",
]);
