import { sql } from "drizzle-orm";

import {
	bigint,
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
import { users } from "./auth";
import { conferences } from "./conferences";
import { importEntityEnum, importRowStatusEnum, importStatusEnum } from "./enums";
import { files } from "./files";

export const importJobs = pgTable(
	"import_jobs",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),

		targetEntity: importEntityEnum("target_entity").notNull(),
		status: importStatusEnum("status").notNull().default("uploaded"),

		sourceFilename: text("source_filename"),
		fileId: uuid("file_id").references(() => files.id, {
			onDelete: "set null",
		}),
		sourceMimeType: varchar("source_mime_type", { length: 128 }),
		sourceSizeBytes: bigint("source_size_bytes", { mode: "number" }),

		sourceColumns: jsonb("source_columns")
			.$type<string[]>()
			.default(sql`'[]'::jsonb`),
		columnMapping: jsonb("column_mapping").$type<Record<string, string>>(),

		options: jsonb("options")
			.notNull()
			.default(
				sql`'{
				"on_duplicate": "skip",
				"update_existing": false,
				"trim_whitespace": true,
				"empty_string_as_null": true
			}'::jsonb`,
			)
			.$type<{
				dedupe_by?: string;
				on_duplicate?: "skip" | "update" | "fail";
				update_existing?: boolean;
				trim_whitespace?: boolean;
				empty_string_as_null?: boolean;
				default_values?: Record<string, unknown>;
				[k: string]: unknown;
			}>(),

		totalRowCount: integer("total_row_count").notNull().default(0),
		processedRowCount: integer("processed_row_count").notNull().default(0),
		validRowCount: integer("valid_row_count").notNull().default(0),
		invalidRowCount: integer("invalid_row_count").notNull().default(0),
		duplicateRowCount: integer("duplicate_row_count").notNull().default(0),
		importedRowCount: integer("imported_row_count").notNull().default(0),
		failedRowCount: integer("failed_row_count").notNull().default(0),

		errorMessage: text("error_message"),
		startedAt: timestamp("started_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		rolledBackAt: timestamp("rolled_back_at", { withTimezone: true }),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("import_jobs_conf_idx").on(t.conferenceId),
		statusIdx: index("import_jobs_status_idx").on(t.conferenceId, t.status),
		entityIdx: index("import_jobs_entity_idx").on(t.conferenceId, t.targetEntity),
		deletedIdx: index("import_jobs_deleted_idx").on(t.deletedAt),
	}),
);

export const importRows = pgTable(
	"import_rows",
	{
		id: uuidPk(),
		jobId: uuid("job_id")
			.notNull()
			.references(() => importJobs.id, { onDelete: "cascade" }),

		rowNumber: integer("row_number").notNull(),
		rawData: jsonb("raw_data").notNull().$type<Record<string, string>>(),
		validatedData: jsonb("validated_data").$type<Record<string, unknown>>(),
		status: importRowStatusEnum("status").notNull().default("pending"),
		errors: jsonb("errors").$type<Record<string, string>>(),
		targetId: uuid("target_id"),
		isUpdate: boolean("is_update").notNull().default(false),
		dupeOfId: uuid("dupe_of_id"),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	t => ({
		jobRowUnique: uniqueIndex("import_rows_job_row_unique").on(t.jobId, t.rowNumber),
		jobIdx: index("import_rows_job_idx").on(t.jobId),
		jobStatusIdx: index("import_rows_job_status_idx").on(t.jobId, t.status),
		targetIdx: index("import_rows_target_idx").on(t.targetId),
	}),
);

export type ImportJob = typeof importJobs.$inferSelect;
export type NewImportJob = typeof importJobs.$inferInsert;
export type ImportRow = typeof importRows.$inferSelect;
export type NewImportRow = typeof importRows.$inferInsert;
