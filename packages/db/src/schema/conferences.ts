import { auditColumns, customFieldsColumn, uuidPk } from "./_shared";
import { users } from "./auth";
import { conferenceStatusEnum, publicStatusEnum } from "./enums";
import { sql } from "drizzle-orm";

import {
	date,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const conferences = pgTable(
	"conferences",
	{
		id: uuidPk(),

		slug: varchar("slug", { length: 64 }).notNull(),
		name: text("name").notNull(),
		shortName: varchar("short_name", { length: 32 }),
		description: text("description"),
		startDate: date("start_date"),
		endDate: date("end_date"),
		timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Kolkata"),
		conferenceStatus: conferenceStatusEnum("conference_status").notNull().default("draft"),
		publicStatus: publicStatusEnum("public_status").notNull().default("draft"),
		venueName: text("venue_name"),
		venueAddress: text("venue_address"),
		venueCity: text("venue_city"),
		venueState: text("venue_state"),
		venueCountry: text("venue_country"),
		currentDay: integer("current_day"),

		logoFileId: uuid("logo_file_id"),
		bannerFileId: uuid("banner_file_id"),

		settings: jsonb("settings")
			.notNull()
			.default(
				sql`'{
				"features": {
					"travel": true,
					"accommodation": true,
					"food": true,
					"helpdesk": true,
					"vip": true,
					"certificates": true,
					"finance": true,
					"communications": true,
					"sessions": true
				},
				"defaults": {
					"currency": "INR",
					"locale": "en-IN"
				}
			}'::jsonb`,
			)
			.$type<{
				features: Record<string, boolean>;
				defaults: Record<string, string>;
				[k: string]: unknown;
			}>(),
		branding: jsonb("branding")
			.notNull()
			.default(sql`'{}'::jsonb`)
			.$type<Record<string, string>>(),
		...customFieldsColumn(),
		...auditColumns(() => users.id),
	},
	t => ({
		slugUnique: uniqueIndex("conferences_slug_unique").on(t.slug),
		statusIdx: index("conferences_status_idx").on(t.conferenceStatus),
		datesIdx: index("conferences_dates_idx").on(t.startDate, t.endDate),
		deletedIdx: index("conferences_deleted_idx").on(t.deletedAt),
	}),
);

export type Conference = typeof conferences.$inferSelect;
export type NewConference = typeof conferences.$inferInsert;
