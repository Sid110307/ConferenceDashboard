import { auditColumns, customFieldsColumn, uuidPk } from "@/schema/_shared";
import { users } from "@/schema/auth";
import { conferences } from "@/schema/conferences";
import {
	attendeeCategoryEnum,
	checkinStatusEnum,
	dietPreferenceEnum,
	genderEnum,
	protocolLevelEnum,
	registrationStatusEnum,
} from "@/schema/enums";
import { files } from "@/schema/files";
import { sql } from "drizzle-orm";

import {
	boolean,
	date,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const attendees = pgTable(
	"attendees",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),

		attendeeCode: varchar("attendee_code", { length: 32 }).notNull(),
		salutation: varchar("salutation", { length: 16 }),
		name: text("name").notNull(),
		gender: genderEnum("gender"),
		dob: date("dob"),

		designation: text("designation"),
		department: text("department"),
		institution: text("institution"),
		institutionType: varchar("institution_type", { length: 32 }),

		prantha: text("prantha"),
		city: text("city"),
		state: text("state"),
		country: text("country"),
		pincode: varchar("pincode", { length: 16 }),
		address: text("address"),

		email: text("email"),
		phone: text("phone"),
		altPhone: text("alt_phone"),
		whatsapp: text("whatsapp"),

		category: attendeeCategoryEnum("category").notNull().default("other"),
		registrationStatus: registrationStatusEnum("registration_status")
			.notNull()
			.default("registered"),
		registrationDate: timestamp("registration_date", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
		registrationSource: varchar("registration_source", { length: 32 })
			.notNull()
			.default("manual"),

		checkinStatus: checkinStatusEnum("checkin_status").notNull().default("not_checked_in"),
		checkedInAt: timestamp("checked_in_at", { withTimezone: true }),
		checkedInByUserId: uuid("checked_in_by_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		checkedOutAt: timestamp("checked_out_at", { withTimezone: true }),
		badgePrinted: boolean("badge_printed").notNull().default(false),
		kitCollected: boolean("kit_collected").notNull().default(false),

		dietaryPreference: dietPreferenceEnum("dietary_preference").notNull().default("none"),
		dietaryNotes: text("dietary_notes"),
		allergies: text("allergies"),

		isVip: boolean("is_vip").notNull().default(false),
		protocolLevel: protocolLevelEnum("protocol_level").notNull().default("none"),

		emergencyContactName: text("emergency_contact_name"),
		emergencyContactPhone: text("emergency_contact_phone"),
		emergencyContactRelation: varchar("emergency_contact_relation", {
			length: 32,
		}),
		bloodGroup: varchar("blood_group", { length: 8 }),
		specialNeeds: text("special_needs"),

		photoFileId: uuid("photo_file_id").references(() => files.id, {
			onDelete: "set null",
		}),

		registrationFee: text("registration_fee"),
		paymentReference: varchar("payment_reference", { length: 64 }),
		paymentReceivedAt: timestamp("payment_received_at", { withTimezone: true }),

		notes: text("notes"),
		tags: text("tags").array(),

		...customFieldsColumn(),
		...auditColumns(() => users.id),
	},
	t => ({
		confCodeUnique: uniqueIndex("attendees_conf_code_unique").on(
			t.conferenceId,
			t.attendeeCode,
		),

		confEmailUnique: uniqueIndex("attendees_conf_email_unique")
			.on(t.conferenceId, t.email)
			.where(sql`email IS NOT NULL AND deleted_at IS NULL`),
		confPhoneUnique: uniqueIndex("attendees_conf_phone_unique")
			.on(t.conferenceId, t.phone)
			.where(sql`phone IS NOT NULL AND deleted_at IS NULL`),
		confIdx: index("attendees_conf_idx").on(t.conferenceId),
		confNameIdx: index("attendees_conf_name_idx").on(t.conferenceId, t.name),
		confCategoryIdx: index("attendees_conf_category_idx").on(t.conferenceId, t.category),
		confRegStatusIdx: index("attendees_conf_reg_status_idx").on(
			t.conferenceId,
			t.registrationStatus,
		),
		confCheckinIdx: index("attendees_conf_checkin_idx").on(t.conferenceId, t.checkinStatus),
		confGenderIdx: index("attendees_conf_gender_idx").on(t.conferenceId, t.gender),
		confPranthaIdx: index("attendees_conf_prantha_idx").on(t.conferenceId, t.prantha),
		confVipIdx: index("attendees_conf_vip_idx").on(t.conferenceId, t.isVip),
		deletedIdx: index("attendees_deleted_idx").on(t.deletedAt),

		nameTrgmIdx: index("attendees_name_trgm_idx").using("gin", sql`name gin_trgm_ops`),
		tagsIdx: index("attendees_tags_idx").using("gin", t.tags),
		customFieldsIdx: index("attendees_custom_fields_idx").using(
			"gin",
			sql`custom_fields jsonb_path_ops`,
		),
	}),
);

export type Attendee = typeof attendees.$inferSelect;
export type NewAttendee = typeof attendees.$inferInsert;
