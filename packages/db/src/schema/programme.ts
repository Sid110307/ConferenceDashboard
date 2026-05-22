import { sql } from "drizzle-orm";

import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, customFieldsColumn, uuidPk } from "./_shared";
import { users } from "./auth";
import { conferences } from "./conferences";
import { publicStatusEnum, sessionStatusEnum, sessionTypeEnum, venueStatusEnum } from "./enums";
import { files } from "./files";

export const venues = pgTable(
	"venues",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		location: text("location"),
		capacity: integer("capacity"),
		description: text("description"),
		hasProjector: boolean("has_projector").notNull().default(false),
		hasMic: boolean("has_mic").notNull().default(false),
		hasAc: boolean("has_ac").notNull().default(false),
		hasRecording: boolean("has_recording").notNull().default(false),
		status: venueStatusEnum("status").notNull().default("active"),
		isPublic: boolean("is_public").notNull().default(true),
		sortOrder: integer("sort_order").notNull().default(0),
		...customFieldsColumn(),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("venues_conf_idx").on(t.conferenceId),
		deletedIdx: index("venues_deleted_idx").on(t.deletedAt),
	}),
);

export const tracks = pgTable(
	"tracks",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		code: varchar("code", { length: 32 }),
		description: text("description"),
		color: varchar("color", { length: 16 }),
		isPublic: boolean("is_public").notNull().default(true),
		sortOrder: integer("sort_order").notNull().default(0),
		...auditColumns(() => users.id),
	},
	t => ({
		confCodeUnique: uniqueIndex("tracks_conf_code_unique")
			.on(t.conferenceId, t.code)
			.where(sql`code IS NOT NULL`),
		confIdx: index("tracks_conf_idx").on(t.conferenceId),
		deletedIdx: index("tracks_deleted_idx").on(t.deletedAt),
	}),
);

export const speakers = pgTable(
	"speakers",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		salutation: varchar("salutation", { length: 16 }),
		designation: text("designation"),
		institution: text("institution"),
		bio: text("bio"),
		photoFileId: uuid("photo_file_id").references(() => files.id, {
			onDelete: "set null",
		}),
		email: text("email"),
		phone: text("phone"),
		website: text("website"),
		twitter: text("twitter"),
		linkedin: text("linkedin"),
		isVip: boolean("is_vip").notNull().default(false),
		isPublic: boolean("is_public").notNull().default(true),
		sortOrder: integer("sort_order").notNull().default(0),
		...customFieldsColumn(),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("speakers_conf_idx").on(t.conferenceId),
		deletedIdx: index("speakers_deleted_idx").on(t.deletedAt),
	}),
);

export const conferenceSessions = pgTable(
	"conference_sessions",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		description: text("description"),
		sessionType: sessionTypeEnum("session_type").notNull().default("invited"),
		startTime: timestamp("start_time", { withTimezone: true }),
		endTime: timestamp("end_time", { withTimezone: true }),
		trackId: uuid("track_id").references(() => tracks.id, {
			onDelete: "set null",
		}),
		venueId: uuid("venue_id").references(() => venues.id, {
			onDelete: "set null",
		}),
		status: sessionStatusEnum("status").notNull().default("upcoming"),
		publicStatus: publicStatusEnum("public_status").notNull().default("draft"),
		isPublic: boolean("is_public").notNull().default(true),
		sortOrder: integer("sort_order").notNull().default(0),
		...customFieldsColumn(),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("conf_sessions_conf_idx").on(t.conferenceId),
		confStartIdx: index("conf_sessions_conf_start_idx").on(t.conferenceId, t.startTime),
		confTrackIdx: index("conf_sessions_conf_track_idx").on(t.conferenceId, t.trackId),
		confVenueIdx: index("conf_sessions_conf_venue_idx").on(t.conferenceId, t.venueId),
		deletedIdx: index("conf_sessions_deleted_idx").on(t.deletedAt),
	}),
);

export const sessionSpeakers = pgTable(
	"session_speakers",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		sessionId: uuid("session_id")
			.notNull()
			.references(() => conferenceSessions.id, { onDelete: "cascade" }),
		speakerId: uuid("speaker_id")
			.notNull()
			.references(() => speakers.id, { onDelete: "cascade" }),
		role: varchar("role", { length: 32 }),
		sortOrder: integer("sort_order").notNull().default(0),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	t => ({
		uniquePair: uniqueIndex("session_speakers_unique").on(t.sessionId, t.speakerId),
		sessionIdx: index("session_speakers_session_idx").on(t.sessionId),
		speakerIdx: index("session_speakers_speaker_idx").on(t.speakerId),
	}),
);

export type Venue = typeof venues.$inferSelect;
export type NewVenue = typeof venues.$inferInsert;
export type Track = typeof tracks.$inferSelect;
export type Speaker = typeof speakers.$inferSelect;
export type ConferenceSession = typeof conferenceSessions.$inferSelect;
export type NewSession = typeof conferenceSessions.$inferInsert;
export type SessionSpeaker = typeof sessionSpeakers.$inferSelect;
