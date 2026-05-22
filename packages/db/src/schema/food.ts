import { sql } from "drizzle-orm";

import {
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

import { auditColumns, uuidPk } from "./_shared";
import { attendees } from "./attendees";
import { users } from "./auth";
import { conferences } from "./conferences";
import { mealTypeEnum } from "./enums";

export const foodPlans = pgTable(
	"food_plans",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),

		dayLabel: varchar("day_label", { length: 32 }),
		mealDate: date("meal_date").notNull(),

		breakfastCount: integer("breakfast_count").notNull().default(0),
		lunchCount: integer("lunch_count").notNull().default(0),
		teaCount: integer("tea_count").notNull().default(0),
		dinnerCount: integer("dinner_count").notNull().default(0),
		snacksCount: integer("snacks_count").notNull().default(0),

		vegCount: integer("veg_count").notNull().default(0),
		nonvegCount: integer("nonveg_count").notNull().default(0),
		veganCount: integer("vegan_count").notNull().default(0),
		jainCount: integer("jain_count").notNull().default(0),
		specialCount: integer("special_count").notNull().default(0),

		venue: text("venue"),
		caterer: text("caterer"),
		notes: text("notes"),

		...auditColumns(() => users.id),
	},
	t => ({
		confDateUnique: uniqueIndex("food_plans_conf_date_unique").on(t.conferenceId, t.mealDate),
		confIdx: index("food_plans_conf_idx").on(t.conferenceId),
		deletedIdx: index("food_plans_deleted_idx").on(t.deletedAt),
	}),
);

export const mealScans = pgTable(
	"meal_scans",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		attendeeId: uuid("attendee_id")
			.notNull()
			.references(() => attendees.id, { onDelete: "cascade" }),

		mealType: mealTypeEnum("meal_type").notNull(),
		mealDate: date("meal_date").notNull(),
		scannedAt: timestamp("scanned_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
		scannedByUserId: uuid("scanned_by_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		scannerLocation: text("scanner_location"),
		notes: text("notes"),

		...auditColumns(() => users.id),
	},
	t => ({
		uniqueScan: uniqueIndex("meal_scans_unique").on(t.attendeeId, t.mealDate, t.mealType),
		confIdx: index("meal_scans_conf_idx").on(t.conferenceId),
		confDateMealIdx: index("meal_scans_conf_date_meal_idx").on(
			t.conferenceId,
			t.mealDate,
			t.mealType,
		),
		deletedIdx: index("meal_scans_deleted_idx").on(t.deletedAt),
	}),
);

export type FoodPlan = typeof foodPlans.$inferSelect;
export type NewFoodPlan = typeof foodPlans.$inferInsert;
export type MealScan = typeof mealScans.$inferSelect;
export type NewMealScan = typeof mealScans.$inferInsert;
