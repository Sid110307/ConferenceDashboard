import { auditColumns, customFieldsColumn, uuidPk } from "@/schema/_shared";
import { users } from "@/schema/auth";
import { conferences } from "@/schema/conferences";
import {
	financeCategoryEnum,
	financeTypeEnum,
	logisticsCategoryEnum,
	logisticsStatusEnum,
	paymentStatusEnum,
	sponsorTierEnum,
} from "@/schema/enums";
import { files } from "@/schema/files";

import {
	boolean,
	index,
	integer,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

export const financeItems = pgTable(
	"finance_items",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),

		itemName: text("item_name").notNull(),
		itemType: financeTypeEnum("item_type").notNull(),
		category: financeCategoryEnum("category").notNull().default("misc"),

		budgetAmount: numeric("budget_amount", { precision: 14, scale: 2 }).notNull().default("0"),
		actualAmount: numeric("actual_amount", { precision: 14, scale: 2 }).notNull().default("0"),
		currency: varchar("currency", { length: 8 }).notNull().default("INR"),

		paymentStatus: paymentStatusEnum("payment_status").notNull().default("pending"),
		vendorOrSource: text("vendor_or_source"),
		invoiceNumber: varchar("invoice_number", { length: 64 }),
		invoiceFileId: uuid("invoice_file_id").references(() => files.id, {
			onDelete: "set null",
		}),
		paidAt: timestamp("paid_at", { withTimezone: true }),
		paymentReference: varchar("payment_reference", { length: 64 }),

		notes: text("notes"),
		...customFieldsColumn(),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("finance_items_conf_idx").on(t.conferenceId),
		confTypeIdx: index("finance_items_conf_type_idx").on(t.conferenceId, t.itemType),
		confCategoryIdx: index("finance_items_conf_category_idx").on(t.conferenceId, t.category),
		confPaymentIdx: index("finance_items_conf_payment_idx").on(t.conferenceId, t.paymentStatus),
		deletedIdx: index("finance_items_deleted_idx").on(t.deletedAt),
	}),
);
// ────────────────────────────────────────────────────────────────────
// sponsors
// ────────────────────────────────────────────────────────────────────
export const sponsors = pgTable(
	"sponsors",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		tier: sponsorTierEnum("tier").notNull().default("partner"),
		contributionAmount: numeric("contribution_amount", {
			precision: 14,
			scale: 2,
		}),
		currency: varchar("currency", { length: 8 }).notNull().default("INR"),
		logoFileId: uuid("logo_file_id").references(() => files.id, {
			onDelete: "set null",
		}),
		website: text("website"),
		description: text("description"),
		contactName: text("contact_name"),
		contactEmail: text("contact_email"),
		contactPhone: text("contact_phone"),
		mouFileId: uuid("mou_file_id").references(() => files.id, {
			onDelete: "set null",
		}),
		isPublic: boolean("is_public").notNull().default(true),
		sortOrder: integer("sort_order").notNull().default(0),
		...customFieldsColumn(),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("sponsors_conf_idx").on(t.conferenceId),
		confTierIdx: index("sponsors_conf_tier_idx").on(t.conferenceId, t.tier),
		deletedIdx: index("sponsors_deleted_idx").on(t.deletedAt),
	}),
);

export const logisticsItems = pgTable(
	"logistics_items",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		itemName: text("item_name").notNull(),
		category: logisticsCategoryEnum("category").notNull().default("misc"),
		totalQuantity: integer("total_quantity").notNull().default(0),
		issuedQuantity: integer("issued_quantity").notNull().default(0),
		vendorName: text("vendor_name"),
		vendorContact: text("vendor_contact"),
		unitCost: numeric("unit_cost", { precision: 14, scale: 2 }),
		currency: varchar("currency", { length: 8 }).notNull().default("INR"),
		status: logisticsStatusEnum("status").notNull().default("pending"),
		notes: text("notes"),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("logistics_items_conf_idx").on(t.conferenceId),
		confCategoryIdx: index("logistics_items_conf_category_idx").on(t.conferenceId, t.category),
		deletedIdx: index("logistics_items_deleted_idx").on(t.deletedAt),
	}),
);

export type FinanceItem = typeof financeItems.$inferSelect;
export type NewFinanceItem = typeof financeItems.$inferInsert;
export type Sponsor = typeof sponsors.$inferSelect;
export type LogisticsItem = typeof logisticsItems.$inferSelect;
