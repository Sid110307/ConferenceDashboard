import { sql } from "drizzle-orm";

import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { auditColumns, uuidPk } from "./_shared";
import { users } from "./auth";
import { conferences } from "./conferences";
import { customFieldEntityEnum, customFieldTypeEnum } from "./enums";

export const customFieldDefinitions = pgTable(
	"custom_field_definitions",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		entity: customFieldEntityEnum("entity").notNull(),

		fieldKey: varchar("field_key", { length: 64 }).notNull(),
		fieldLabel: text("field_label").notNull(),
		fieldType: customFieldTypeEnum("field_type").notNull(),

		isRequired: boolean("is_required").notNull().default(false),
		isUnique: boolean("is_unique").notNull().default(false),
		isVisibleInList: boolean("is_visible_in_list").notNull().default(false),
		isSearchable: boolean("is_searchable").notNull().default(false),

		defaultValue: text("default_value"),
		placeholder: text("placeholder"),
		helpText: text("help_text"),
		options: jsonb("options")
			.notNull()
			.default(sql`'[]'::jsonb`)
			.$type<{ value: string; label: string; color?: string }[]>(),

		validation: jsonb("validation")
			.notNull()
			.default(sql`'{}'::jsonb`)
			.$type<{
				regex?: string;
				min?: number;
				max?: number;
				minLength?: number;
				maxLength?: number;
			}>(),

		groupName: varchar("group_name", { length: 64 }),
		sortOrder: integer("sort_order").notNull().default(0),
		isActive: boolean("is_active").notNull().default(true),

		...auditColumns(() => users.id),
	},
	t => ({
		uniqueKey: uniqueIndex("custom_fields_unique_key").on(t.conferenceId, t.entity, t.fieldKey),
		confEntityIdx: index("custom_fields_conf_entity_idx").on(t.conferenceId, t.entity),
		sortIdx: index("custom_fields_sort_idx").on(t.conferenceId, t.entity, t.sortOrder),
		deletedIdx: index("custom_fields_deleted_idx").on(t.deletedAt),
	}),
);

export type CustomFieldDefinition = typeof customFieldDefinitions.$inferSelect;
export type NewCustomFieldDefinition = typeof customFieldDefinitions.$inferInsert;
