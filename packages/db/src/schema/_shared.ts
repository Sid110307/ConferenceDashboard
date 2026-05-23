import { sql } from "drizzle-orm";

import { jsonb, text, timestamp, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

export const auditColumns = (userFK: () => AnyPgColumn) => ({
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	createdBy: text("created_by").references(userFK, { onDelete: "set null" }),
	updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	updatedBy: text("updated_by").references(userFK, { onDelete: "set null" }),
	deletedAt: timestamp("deleted_at", { withTimezone: true }),
	deletedBy: text("deleted_by").references(userFK, { onDelete: "set null" }),
});

export const customFieldsColumn = () => ({
	customFields: jsonb("custom_fields")
		.notNull()
		.default(sql`'{}'::jsonb`)
		.$type<Record<string, unknown>>(),
});

export const uuidPk = () =>
	uuid("id")
		.primaryKey()
		.notNull()
		.default(sql`gen_random_uuid()`);
