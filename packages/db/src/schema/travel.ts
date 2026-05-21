import { auditColumns, customFieldsColumn, uuidPk } from "./_shared";
import { attendees } from "./attendees";
import { users } from "./auth";
import { conferences } from "./conferences";
import {
	pickupStatusEnum,
	travelDirectionEnum,
	travelModeEnum,
	travelStatusEnum,
	vehicleStatusEnum,
} from "./enums";
import { committees } from "./staff";

import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const vehicles = pgTable(
	"vehicles",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),

		vehicleCode: varchar("vehicle_code", { length: 32 }),
		vehicleType: varchar("vehicle_type", { length: 32 }),
		plateNumber: varchar("plate_number", { length: 32 }),
		make: varchar("make", { length: 64 }),
		model: varchar("model", { length: 64 }),
		capacity: integer("capacity").notNull().default(4),

		driverName: text("driver_name"),
		driverPhone: text("driver_phone"),
		driverLicense: varchar("driver_license", { length: 64 }),

		assignedCommitteeId: uuid("assigned_committee_id").references(() => committees.id, {
			onDelete: "set null",
		}),
		isExternal: boolean("is_external").notNull().default(false),
		vendorName: text("vendor_name"),
		vendorContact: text("vendor_contact"),
		ratePerDay: text("rate_per_day"),

		status: vehicleStatusEnum("status").notNull().default("available"),
		notes: text("notes"),
		...customFieldsColumn(),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("vehicles_conf_idx").on(t.conferenceId),
		confCodeUnique: index("vehicles_conf_code_idx").on(t.conferenceId, t.vehicleCode),
		statusIdx: index("vehicles_status_idx").on(t.conferenceId, t.status),
		deletedIdx: index("vehicles_deleted_idx").on(t.deletedAt),
	}),
);

export const travelSegments = pgTable(
	"travel_segments",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		attendeeId: uuid("attendee_id")
			.notNull()
			.references(() => attendees.id, { onDelete: "cascade" }),

		direction: travelDirectionEnum("direction").notNull(),
		travelMode: travelModeEnum("travel_mode").notNull().default("other"),

		carrier: text("carrier"),
		serviceNumber: varchar("service_number", { length: 32 }),
		pnr: varchar("pnr", { length: 32 }),
		seatNumber: varchar("seat_number", { length: 16 }),
		coachNumber: varchar("coach_number", { length: 16 }),
		classOfTravel: varchar("class_of_travel", { length: 32 }),

		originCity: text("origin_city"),
		originLocation: text("origin_location"),
		originTerminal: varchar("origin_terminal", { length: 16 }),
		destinationCity: text("destination_city"),
		destinationLocation: text("destination_location"),
		destinationTerminal: varchar("destination_terminal", { length: 16 }),

		scheduledTime: timestamp("scheduled_time", { withTimezone: true }),
		actualTime: timestamp("actual_time", { withTimezone: true }),
		status: travelStatusEnum("status").notNull().default("planned"),

		pickupRequired: boolean("pickup_required").notNull().default(false),
		pickupStatus: pickupStatusEnum("pickup_status").notNull().default("not_required"),
		pickupPoint: text("pickup_point"),
		dropPoint: text("drop_point"),
		pickupScheduledAt: timestamp("pickup_scheduled_at", { withTimezone: true }),
		pickupCompletedAt: timestamp("pickup_completed_at", { withTimezone: true }),

		vehicleId: uuid("vehicle_id").references(() => vehicles.id, {
			onDelete: "set null",
		}),
		driverNameOverride: text("driver_name_override"),
		driverPhoneOverride: text("driver_phone_override"),
		travelGroupCode: varchar("travel_group_code", { length: 32 }),

		ticketFileId: uuid("ticket_file_id"),
		notes: text("notes"),

		...customFieldsColumn(),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("travel_segments_conf_idx").on(t.conferenceId),
		attendeeIdx: index("travel_segments_attendee_idx").on(t.attendeeId),
		confDirectionIdx: index("travel_segments_conf_direction_idx").on(
			t.conferenceId,
			t.direction,
		),
		confDirectionTimeIdx: index("travel_segments_conf_direction_time_idx").on(
			t.conferenceId,
			t.direction,
			t.scheduledTime,
		),
		confPickupStatusIdx: index("travel_segments_conf_pickup_status_idx").on(
			t.conferenceId,
			t.pickupStatus,
		),
		vehicleIdx: index("travel_segments_vehicle_idx").on(t.vehicleId),
		groupIdx: index("travel_segments_group_idx").on(t.conferenceId, t.travelGroupCode),
		deletedIdx: index("travel_segments_deleted_idx").on(t.deletedAt),
	}),
);

export type Vehicle = typeof vehicles.$inferSelect;
export type NewVehicle = typeof vehicles.$inferInsert;
export type TravelSegment = typeof travelSegments.$inferSelect;
export type NewTravelSegment = typeof travelSegments.$inferInsert;
