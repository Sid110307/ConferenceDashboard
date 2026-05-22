import { sql } from "drizzle-orm";

import {
	boolean,
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

import { auditColumns, uuidPk } from "./_shared";
import { attendees } from "./attendees";
import { users } from "./auth";
import { conferences } from "./conferences";
import { certificateStatusEnum, certificateTypeEnum, priorityEnum } from "./enums";
import { files } from "./files";
import { conferenceSessions } from "./programme";

export const certificates = pgTable(
	"certificates",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		attendeeId: uuid("attendee_id")
			.notNull()
			.references(() => attendees.id, { onDelete: "cascade" }),

		certificateType: certificateTypeEnum("certificate_type").notNull().default("participation"),
		certificateCode: varchar("certificate_code", { length: 64 }).notNull(),
		status: certificateStatusEnum("status").notNull().default("not_issued"),

		generatedAt: timestamp("generated_at", { withTimezone: true }),
		issuedAt: timestamp("issued_at", { withTimezone: true }),
		emailedAt: timestamp("emailed_at", { withTimezone: true }),
		printedAt: timestamp("printed_at", { withTimezone: true }),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),

		certificateFileId: uuid("certificate_file_id").references(() => files.id, {
			onDelete: "set null",
		}),
		verificationToken: varchar("verification_token", { length: 64 }),

		...auditColumns(() => users.id),
	},
	t => ({
		confCodeUnique: uniqueIndex("certificates_conf_code_unique").on(
			t.conferenceId,
			t.certificateCode,
		),
		confIdx: index("certificates_conf_idx").on(t.conferenceId),
		attendeeIdx: index("certificates_attendee_idx").on(t.attendeeId),
		statusIdx: index("certificates_status_idx").on(t.conferenceId, t.status),
		deletedIdx: index("certificates_deleted_idx").on(t.deletedAt),
	}),
);

export const announcements = pgTable(
	"announcements",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		title: text("title").notNull(),
		message: text("message").notNull(),
		priority: priorityEnum("priority").notNull().default("medium"),
		visibleFrom: timestamp("visible_from", { withTimezone: true }),
		visibleUntil: timestamp("visible_until", { withTimezone: true }),
		isPublic: boolean("is_public").notNull().default(true),
		isPinned: boolean("is_pinned").notNull().default(false),
		sortOrder: integer("sort_order").notNull().default(0),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("announcements_conf_idx").on(t.conferenceId),
		visibleIdx: index("announcements_visible_idx").on(
			t.conferenceId,
			t.visibleFrom,
			t.visibleUntil,
		),
		deletedIdx: index("announcements_deleted_idx").on(t.deletedAt),
	}),
);

export const appSettings = pgTable(
	"app_settings",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		settingKey: varchar("setting_key", { length: 128 }).notNull(),
		settingValue: jsonb("setting_value")
			.notNull()
			.default(sql`'{}'::jsonb`)
			.$type<unknown>(),
		description: text("description"),
		...auditColumns(() => users.id),
	},
	t => ({
		confKeyUnique: uniqueIndex("app_settings_conf_key_unique").on(t.conferenceId, t.settingKey),
		confIdx: index("app_settings_conf_idx").on(t.conferenceId),
		deletedIdx: index("app_settings_deleted_idx").on(t.deletedAt),
	}),
);

export const themeSettings = pgTable(
	"theme_settings",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		primaryColor: varchar("primary_color", { length: 32 }),
		accentColor: varchar("accent_color", { length: 32 }),
		backgroundColor: varchar("background_color", { length: 32 }),
		cardColor: varchar("card_color", { length: 32 }),
		textColor: varchar("text_color", { length: 32 }),
		fontFamily: varchar("font_family", { length: 64 }),
		logoFileId: uuid("logo_file_id").references(() => files.id, {
			onDelete: "set null",
		}),
		faviconFileId: uuid("favicon_file_id").references(() => files.id, {
			onDelete: "set null",
		}),
		customCss: text("custom_css"),
		config: jsonb("config")
			.notNull()
			.default(sql`'{}'::jsonb`)
			.$type<Record<string, unknown>>(),
		...auditColumns(() => users.id),
	},
	t => ({
		confUnique: uniqueIndex("theme_settings_conf_unique").on(t.conferenceId),
	}),
);

export const feedback = pgTable(
	"feedback",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		attendeeId: uuid("attendee_id").references(() => attendees.id, {
			onDelete: "set null",
		}),
		sessionId: uuid("session_id").references(() => conferenceSessions.id, {
			onDelete: "set null",
		}),
		rating: integer("rating"),
		comments: text("comments"),
		submittedAt: timestamp("submitted_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
		isPublic: boolean("is_public").notNull().default(false),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("feedback_conf_idx").on(t.conferenceId),
		sessionIdx: index("feedback_session_idx").on(t.sessionId),
		ratingCheck: index("feedback_rating_idx").on(t.rating),
		deletedIdx: index("feedback_deleted_idx").on(t.deletedAt),
	}),
);

export const dailyControlLogs = pgTable(
	"daily_control_logs",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		logDate: timestamp("log_date", { withTimezone: true }).notNull(),
		dayLabel: varchar("day_label", { length: 32 }),
		shiftLabel: varchar("shift_label", { length: 32 }),
		summary: text("summary").notNull(),
		incidents: text("incidents"),
		actionsTaken: text("actions_taken"),
		pendingActions: text("pending_actions"),

		stats: jsonb("stats")
			.notNull()
			.default(sql`'{}'::jsonb`)
			.$type<Record<string, number>>(),
		shiftHeadName: text("shift_head_name"),
		shiftHeadStaffId: uuid("shift_head_staff_id"),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("daily_control_logs_conf_idx").on(t.conferenceId),
		confDateIdx: index("daily_control_logs_conf_date_idx").on(t.conferenceId, t.logDate),
		deletedIdx: index("daily_control_logs_deleted_idx").on(t.deletedAt),
	}),
);

export type Certificate = typeof certificates.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type AppSetting = typeof appSettings.$inferSelect;
export type ThemeSetting = typeof themeSettings.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;
export type DailyControlLog = typeof dailyControlLogs.$inferSelect;
