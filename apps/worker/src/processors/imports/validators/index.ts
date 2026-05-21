import { z } from "zod";

export type Mapping = Record<string, string>;

export type ValidationResult<T = Record<string, unknown>> =
	| { ok: true; value: T }
	| { ok: false; errors: Record<string, string> };

function pick(row: Record<string, string>, mapping: Mapping) {
	const out: Record<string, string> = {};
	for (const [src, dst] of Object.entries(mapping)) {
		const v = row[src];
		if (v != null && v !== "") out[dst] = v;
	}
	return out;
}

const attendeeSchema = z.object({
	name: z.string().min(1).max(255),
	email: z
		.string()
		.email()
		.transform(s => s.toLowerCase())
		.optional()
		.or(z.literal("")),
	phone: z.string().max(32).optional(),
	whatsapp: z.string().max(32).optional(),
	gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
	dateOfBirth: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/)
		.optional(),
	bloodGroup: z
		.enum(["a_pos", "a_neg", "b_pos", "b_neg", "o_pos", "o_neg", "ab_pos", "ab_neg", "unknown"])
		.optional(),
	category: z
		.enum([
			"delegate",
			"speaker",
			"keynote",
			"vip",
			"sponsor",
			"organiser",
			"student",
			"faculty",
			"media",
			"observer",
		])
		.optional(),
	institution: z.string().max(255).optional(),
	designation: z.string().max(255).optional(),
	department: z.string().max(255).optional(),
	prantha: z.string().max(120).optional(),
	city: z.string().max(120).optional(),
	state: z.string().max(120).optional(),
	pincode: z.string().max(16).optional(),
	country: z.string().max(80).optional(),
	registrationStatus: z
		.enum(["pending", "registered", "confirmed", "cancelled", "waitlisted"])
		.optional(),
	dietaryPreference: z
		.enum(["veg", "non_veg", "vegan", "jain", "no_onion_garlic", "special"])
		.optional(),
	isVip: z.preprocess(v => {
		if (typeof v !== "string") return v;
		const s = v.trim().toLowerCase();
		if (["true", "yes", "1", "y"].includes(s)) return true;
		if (["false", "no", "0", "n", ""].includes(s)) return false;
		return v;
	}, z.boolean().optional()),
});

export function validateAttendee(row: Record<string, string>, mapping: Mapping): ValidationResult {
	const picked = pick(row, mapping);
	const r = attendeeSchema.safeParse(picked);
	if (!r.success) {
		const errors: Record<string, string> = {};
		for (const i of r.error.issues) {
			errors[i.path.join(".") || "_root"] = i.message;
		}
		return { ok: false, errors };
	}

	const out = { ...r.data } as any;
	if (out.email === "") delete out.email;
	return { ok: true, value: out };
}

const staffSchema = z.object({
	name: z.string().min(1).max(255),
	email: z
		.string()
		.email()
		.transform(s => s.toLowerCase())
		.optional(),
	phone: z.string().max(32).optional(),
	gender: z.enum(["male", "female", "other", "prefer_not_to_say"]).optional(),
	bloodGroup: z
		.enum(["a_pos", "a_neg", "b_pos", "b_neg", "o_pos", "o_neg", "ab_pos", "ab_neg", "unknown"])
		.optional(),
	prantha: z.string().max(120).optional(),
	city: z.string().max(120).optional(),
	emergencyContact: z.string().max(255).optional(),
	notes: z.string().max(2000).optional(),
});

export function validateStaff(row: Record<string, string>, mapping: Mapping): ValidationResult {
	const picked = pick(row, mapping);
	const r = staffSchema.safeParse(picked);
	if (!r.success) {
		const errors: Record<string, string> = {};
		for (const i of r.error.issues) {
			errors[i.path.join(".") || "_root"] = i.message;
		}
		return { ok: false, errors };
	}
	return { ok: true, value: r.data };
}

const travelSchema = z.object({
	attendeeRef: z.string().min(1),
	direction: z.enum(["arrival", "departure"]),
	travelMode: z.enum(["flight", "train", "bus", "car", "self_arranged", "other"]),
	carrier: z.string().max(120).optional(),
	serviceNumber: z.string().max(64).optional(),
	pnr: z.string().max(32).optional(),
	originCity: z.string().max(120).optional(),
	destinationCity: z.string().max(120).optional(),
	scheduledTime: z.string().optional(),
});

export function validateTravel(row: Record<string, string>, mapping: Mapping): ValidationResult {
	const picked = pick(row, mapping);
	const r = travelSchema.safeParse(picked);
	if (!r.success) {
		const errors: Record<string, string> = {};
		for (const i of r.error.issues) {
			errors[i.path.join(".") || "_root"] = i.message;
		}
		return { ok: false, errors };
	}
	return { ok: true, value: r.data };
}

export function validatorFor(
	entity: string,
): (row: Record<string, string>, mapping: Mapping) => ValidationResult {
	switch (entity) {
		case "attendees":
			return validateAttendee;
		case "staff":
			return validateStaff;
		case "travel_segments":
			return validateTravel;
		default:
			return (row, mapping) => ({ ok: true, value: pick(row, mapping) });
	}
}
