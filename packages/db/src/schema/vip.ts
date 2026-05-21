import { auditColumns, customFieldsColumn, uuidPk } from "@/schema/_shared";
import { attendees } from "@/schema/attendees";
import { users } from "@/schema/auth";
import { conferences } from "@/schema/conferences";
import { priorityEnum, protocolLevelEnum, vipStatusEnum } from "@/schema/enums";
import { staff } from "@/schema/staff";

import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const vipGuests = pgTable(
	"vip_guests",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		attendeeId: uuid("attendee_id").references(() => attendees.id, {
			onDelete: "set null",
		}),

		name: text("name").notNull(),
		designation: text("designation"),
		institution: text("institution"),
		protocolLevel: protocolLevelEnum("protocol_level").notNull().default("a"),

		arrivalTime: timestamp("arrival_time", { withTimezone: true }),
		departureTime: timestamp("departure_time", { withTimezone: true }),
		vehicle: text("vehicle"),
		securityRequired: boolean("security_required").notNull().default(false),
		speechRequired: boolean("speech_required").notNull().default(false),
		greenRoom: text("green_room"),

		liaisonStaffId: uuid("liaison_staff_id").references(() => staff.id, {
			onDelete: "set null",
		}),

		status: vipStatusEnum("status").notNull().default("pending"),
		notes: text("notes"),

		...customFieldsColumn(),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("vip_guests_conf_idx").on(t.conferenceId),
		statusIdx: index("vip_guests_status_idx").on(t.conferenceId, t.status),
		protocolIdx: index("vip_guests_protocol_idx").on(t.conferenceId, t.protocolLevel),
		deletedIdx: index("vip_guests_deleted_idx").on(t.deletedAt),
	}),
);

export const vipChecklist = pgTable(
	"vip_checklist",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		vipGuestId: uuid("vip_guest_id").references(() => vipGuests.id, {
			onDelete: "cascade",
		}),
		item: text("item").notNull(),
		description: text("description"),
		isDone: boolean("is_done").notNull().default(false),
		assignedTo: text("assigned_to"),
		assignedStaffId: uuid("assigned_staff_id").references(() => staff.id, {
			onDelete: "set null",
		}),
		dueTime: timestamp("due_time", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		priority: priorityEnum("priority").notNull().default("medium"),
		sortOrder: integer("sort_order").notNull().default(0),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("vip_checklist_conf_idx").on(t.conferenceId),
		vipIdx: index("vip_checklist_vip_idx").on(t.vipGuestId),
		deletedIdx: index("vip_checklist_deleted_idx").on(t.deletedAt),
	}),
);

export type VipGuest = typeof vipGuests.$inferSelect;
export type NewVipGuest = typeof vipGuests.$inferInsert;
export type VipChecklistItem = typeof vipChecklist.$inferSelect;
