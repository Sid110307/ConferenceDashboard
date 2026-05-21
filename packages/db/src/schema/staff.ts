import { auditColumns, customFieldsColumn, uuidPk } from "@/schema/_shared";
import { users } from "@/schema/auth";
import { conferences } from "@/schema/conferences";
import { genderEnum, staffStatusEnum } from "@/schema/enums";
import { files } from "@/schema/files";
import { sql } from "drizzle-orm";

import {
	boolean,
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const committees = pgTable(
	"committees",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		slug: varchar("slug", { length: 64 }).notNull(),
		name: text("name").notNull(),
		description: text("description"),
		color: varchar("color", { length: 16 }),
		icon: varchar("icon", { length: 64 }),
		sortOrder: integer("sort_order").notNull().default(0),
		isEnabled: boolean("is_enabled").notNull().default(true),

		leadName: text("lead_name"),
		leadPhone: text("lead_phone"),
		leadEmail: text("lead_email"),
		notes: text("notes"),
		...auditColumns(() => users.id),
	},
	t => ({
		confSlugUnique: uniqueIndex("committees_conf_slug_unique").on(t.conferenceId, t.slug),
		confSortIdx: index("committees_conf_sort_idx").on(t.conferenceId, t.sortOrder),
		deletedIdx: index("committees_deleted_idx").on(t.deletedAt),
	}),
);

export const staff = pgTable(
	"staff",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),

		staffCode: varchar("staff_code", { length: 32 }),

		salutation: varchar("salutation", { length: 16 }),
		name: text("name").notNull(),
		gender: genderEnum("gender"),
		designation: text("designation"),
		department: text("department"),
		institution: text("institution"),

		prantha: text("prantha"),
		city: text("city"),
		state: text("state"),
		country: text("country"),
		address: text("address"),

		email: text("email"),
		phone: text("phone"),
		altPhone: text("alt_phone"),
		whatsapp: text("whatsapp"),

		dob: date("dob"),
		bloodGroup: varchar("blood_group", { length: 8 }),

		emergencyContactName: text("emergency_contact_name"),
		emergencyContactPhone: text("emergency_contact_phone"),
		emergencyContactRelation: varchar("emergency_contact_relation", { length: 32 }),

		photoFileId: uuid("photo_file_id").references(() => files.id, {
			onDelete: "set null",
		}),

		idDocumentType: varchar("id_document_type", { length: 32 }),
		idDocumentNumber: varchar("id_document_number", { length: 64 }),

		status: staffStatusEnum("status").notNull().default("active"),
		notes: text("notes"),

		...customFieldsColumn(),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("staff_conf_idx").on(t.conferenceId),
		confNameIdx: index("staff_conf_name_idx").on(t.conferenceId, t.name),
		confEmailIdx: index("staff_conf_email_idx").on(t.conferenceId, t.email),
		confPhoneIdx: index("staff_conf_phone_idx").on(t.conferenceId, t.phone),
		confStaffCodeUnique: uniqueIndex("staff_conf_code_unique")
			.on(t.conferenceId, t.staffCode)
			.where(sql`staff_code IS NOT NULL`),
		statusIdx: index("staff_status_idx").on(t.conferenceId, t.status),
		deletedIdx: index("staff_deleted_idx").on(t.deletedAt),
		nameTrgmIdx: index("staff_name_trgm_idx").using("gin", sql`name gin_trgm_ops`),
	}),
);

export const committeeAssignments = pgTable(
	"committee_assignments",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		committeeId: uuid("committee_id")
			.notNull()
			.references(() => committees.id, { onDelete: "cascade" }),
		staffId: uuid("staff_id")
			.notNull()
			.references(() => staff.id, { onDelete: "cascade" }),
		roleInCommittee: text("role_in_committee"),
		isLead: boolean("is_lead").notNull().default(false),
		responsibilities: text("responsibilities"),

		shiftStart: timestamp("shift_start", { withTimezone: true }),
		shiftEnd: timestamp("shift_end", { withTimezone: true }),
		assignmentNotes: text("assignment_notes"),
		...auditColumns(() => users.id),
	},
	t => ({
		uniqueAssignment: uniqueIndex("committee_assignments_unique").on(t.committeeId, t.staffId),
		confIdx: index("committee_assignments_conf_idx").on(t.conferenceId),
		committeeIdx: index("committee_assignments_committee_idx").on(t.committeeId),
		staffIdx: index("committee_assignments_staff_idx").on(t.staffId),
		leadIdx: index("committee_assignments_lead_idx").on(t.committeeId, t.isLead),
		deletedIdx: index("committee_assignments_deleted_idx").on(t.deletedAt),
	}),
);

export type Committee = typeof committees.$inferSelect;
export type NewCommittee = typeof committees.$inferInsert;
export type Staff = typeof staff.$inferSelect;
export type NewStaff = typeof staff.$inferInsert;
export type CommitteeAssignment = typeof committeeAssignments.$inferSelect;
export type NewCommitteeAssignment = typeof committeeAssignments.$inferInsert;
