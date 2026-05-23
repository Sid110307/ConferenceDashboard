import { sql } from "drizzle-orm";

import {
	boolean,
	date,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, customFieldsColumn, uuidPk } from "./_shared";
import { attendees } from "./attendees";
import { users } from "./auth";
import { conferences } from "./conferences";
import {
	allocationStatusEnum,
	genderPreferenceEnum,
	issueStatusEnum,
	priorityEnum,
	roomStatusEnum,
	roomTypeEnum,
} from "./enums";

export const accommodationBlocks = pgTable(
	"accommodation_blocks",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		code: varchar("code", { length: 32 }).notNull(),
		name: text("name").notNull(),
		address: text("address"),
		contactName: text("contact_name"),
		contactPhone: text("contact_phone"),
		notes: text("notes"),
		sortOrder: integer("sort_order").notNull().default(0),
		...auditColumns(() => users.id),
	},
	t => ({
		confCodeUnique: uniqueIndex("accom_blocks_conf_code_unique").on(t.conferenceId, t.code),
		confIdx: index("accom_blocks_conf_idx").on(t.conferenceId),
		deletedIdx: index("accom_blocks_deleted_idx").on(t.deletedAt),
	}),
);

export const accommodationRooms = pgTable(
	"accommodation_rooms",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		blockId: uuid("block_id")
			.notNull()
			.references(() => accommodationBlocks.id, { onDelete: "cascade" }),

		roomNumber: varchar("room_number", { length: 32 }).notNull(),
		floor: varchar("floor", { length: 16 }),
		roomType: roomTypeEnum("room_type").notNull().default("double"),
		capacity: integer("capacity").notNull().default(2),
		occupiedCount: integer("occupied_count").notNull().default(0),
		genderPreference: genderPreferenceEnum("gender_preference").notNull().default("none"),
		status: roomStatusEnum("status").notNull().default("available"),

		amenities: jsonb("amenities")
			.notNull()
			.default(sql`'[]'::jsonb`)
			.$type<string[]>(),

		ratePerNight: text("rate_per_night"),
		notes: text("notes"),

		...customFieldsColumn(),
		...auditColumns(() => users.id),
	},
	t => ({
		confBlockNumberUnique: uniqueIndex("accom_rooms_block_number_unique").on(
			t.blockId,
			t.roomNumber,
		),
		confIdx: index("accom_rooms_conf_idx").on(t.conferenceId),
		blockIdx: index("accom_rooms_block_idx").on(t.blockId),
		statusIdx: index("accom_rooms_status_idx").on(t.conferenceId, t.status),
		genderIdx: index("accom_rooms_gender_idx").on(t.conferenceId, t.genderPreference),
		deletedIdx: index("accom_rooms_deleted_idx").on(t.deletedAt),
	}),
);

export const roomAllocations = pgTable(
	"room_allocations",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		roomId: uuid("room_id")
			.notNull()
			.references(() => accommodationRooms.id, { onDelete: "cascade" }),
		attendeeId: uuid("attendee_id")
			.notNull()
			.references(() => attendees.id, { onDelete: "cascade" }),

		bedNumber: varchar("bed_number", { length: 16 }),

		plannedCheckinDate: date("planned_checkin_date"),
		plannedCheckoutDate: date("planned_checkout_date"),

		checkinAt: timestamp("checkin_at", { withTimezone: true }),
		checkoutAt: timestamp("checkout_at", { withTimezone: true }),
		checkinByUserId: text("checkin_by_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		checkoutByUserId: text("checkout_by_user_id").references(() => users.id, {
			onDelete: "set null",
		}),

		keyIssued: boolean("key_issued").notNull().default(false),
		keyReturned: boolean("key_returned").notNull().default(false),

		status: allocationStatusEnum("status").notNull().default("pending"),
		notes: text("notes"),

		...auditColumns(() => users.id),
	},
	t => ({
		uniqueActiveAllocation: uniqueIndex("room_alloc_unique_active")
			.on(t.attendeeId)
			.where(sql`status IN ('pending', 'checked_in') AND deleted_at IS NULL`),
		confIdx: index("room_alloc_conf_idx").on(t.conferenceId),
		roomIdx: index("room_alloc_room_idx").on(t.roomId),
		attendeeIdx: index("room_alloc_attendee_idx").on(t.attendeeId),
		statusIdx: index("room_alloc_status_idx").on(t.conferenceId, t.status),
		deletedIdx: index("room_alloc_deleted_idx").on(t.deletedAt),
	}),
);

export const accommodationIssues = pgTable(
	"accommodation_issues",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		roomId: uuid("room_id").references(() => accommodationRooms.id, {
			onDelete: "set null",
		}),
		attendeeId: uuid("attendee_id").references(() => attendees.id, {
			onDelete: "set null",
		}),

		title: text("title").notNull(),
		description: text("description"),
		priority: priorityEnum("priority").notNull().default("medium"),
		status: issueStatusEnum("status").notNull().default("open"),
		assignedToText: text("assigned_to_text"),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),

		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("accom_issues_conf_idx").on(t.conferenceId),
		roomIdx: index("accom_issues_room_idx").on(t.roomId),
		statusIdx: index("accom_issues_status_idx").on(t.conferenceId, t.status),
		deletedIdx: index("accom_issues_deleted_idx").on(t.deletedAt),
	}),
);

export type AccommodationBlock = typeof accommodationBlocks.$inferSelect;
export type AccommodationRoom = typeof accommodationRooms.$inferSelect;
export type NewAccommodationRoom = typeof accommodationRooms.$inferInsert;
export type RoomAllocation = typeof roomAllocations.$inferSelect;
export type NewRoomAllocation = typeof roomAllocations.$inferInsert;
export type AccommodationIssue = typeof accommodationIssues.$inferSelect;
