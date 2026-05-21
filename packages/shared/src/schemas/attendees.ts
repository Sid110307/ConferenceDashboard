import {
	ATTENDEE_CATEGORIES,
	DIET_PREFERENCES,
	GENDERS,
	type AttendeeCategory,
	type DietPreference,
	type Gender,
} from "../constants";
import {
	customFieldsSchema,
	emailSchema,
	isoDateSchema,
	phoneSchema,
	uuidSchema,
} from "./common";
import { z } from "zod";

const genderEnum = z.enum(GENDERS as readonly [Gender, ...Gender[]]);
const categoryEnum = z.enum(
	ATTENDEE_CATEGORIES as readonly [AttendeeCategory, ...AttendeeCategory[]],
);
const dietEnum = z.enum(DIET_PREFERENCES as readonly [DietPreference, ...DietPreference[]]);

export const attendeeCreateSchema = z.object({
	salutation: z.string().max(16).optional(),
	name: z.string().trim().min(1).max(255),
	gender: genderEnum.optional(),
	dob: isoDateSchema.optional(),

	designation: z.string().max(255).optional(),
	department: z.string().max(255).optional(),
	institution: z.string().max(255).optional(),

	prantha: z.string().max(120).optional(),
	city: z.string().max(120).optional(),
	state: z.string().max(120).optional(),
	country: z.string().max(120).optional(),
	pincode: z.string().max(16).optional(),
	address: z.string().max(500).optional(),

	email: emailSchema.optional(),
	phone: phoneSchema.optional(),
	altPhone: phoneSchema.optional(),
	whatsapp: phoneSchema.optional(),

	category: categoryEnum.default("other"),

	dietaryPreference: dietEnum.default("none"),
	dietaryNotes: z.string().max(500).optional(),
	allergies: z.string().max(500).optional(),

	isVip: z.boolean().default(false),
	protocolLevel: z.enum(["a_plus", "a", "b", "c", "none"]).default("none"),

	emergencyContactName: z.string().max(255).optional(),
	emergencyContactPhone: phoneSchema.optional(),
	emergencyContactRelation: z.string().max(32).optional(),
	bloodGroup: z.string().max(8).optional(),
	specialNeeds: z.string().max(500).optional(),

	registrationFee: z.string().optional(),
	paymentReference: z.string().max(64).optional(),

	notes: z.string().max(2000).optional(),
	tags: z.array(z.string().trim().min(1).max(40)).optional(),

	customFields: customFieldsSchema,
});

export const attendeeUpdateSchema = attendeeCreateSchema.partial();

export const attendeeListQuerySchema = z.object({
	q: z.string().trim().optional(),
	category: categoryEnum.optional(),
	gender: genderEnum.optional(),
	prantha: z.string().optional(),
	city: z.string().optional(),
	state: z.string().optional(),
	registrationStatus: z
		.enum(["registered", "confirmed", "cancelled", "waitlisted", "no_show"])
		.optional(),
	checkinStatus: z.enum(["not_checked_in", "checked_in", "checked_out"]).optional(),
	isVip: z.coerce.boolean().optional(),
	tag: z.string().optional(),
});

export const attendeeBulkActionSchema = z.object({
	ids: z.array(uuidSchema).min(1).max(5000),
	action: z.enum([
		"check_in",
		"check_out",
		"confirm",
		"cancel",
		"mark_badge_printed",
		"mark_kit_collected",
		"delete",
		"restore",
	]),
});

export type AttendeeCreateInput = z.infer<typeof attendeeCreateSchema>;
export type AttendeeUpdateInput = z.infer<typeof attendeeUpdateSchema>;
export type AttendeeListQuery = z.infer<typeof attendeeListQuerySchema>;
export type AttendeeBulkActionInput = z.infer<typeof attendeeBulkActionSchema>;
