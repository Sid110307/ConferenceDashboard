import { sql } from "drizzle-orm";

import { index, integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { auditColumns, uuidPk } from "./_shared";
import { users } from "./auth";
import { conferences } from "./conferences";
import { reportFormatEnum, reportStatusEnum, reportTypeEnum } from "./enums";
import { files } from "./files";

export const reportJobs = pgTable(
	"report_jobs",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),

		reportType: reportTypeEnum("report_type").notNull(),
		name: text("name").notNull(),
		format: reportFormatEnum("format").notNull().default("xlsx"),

		filters: jsonb("filters")
			.notNull()
			.default(sql`'{}'::jsonb`)
			.$type<Record<string, unknown>>(),
		columns: jsonb("columns")
			.notNull()
			.default(sql`'[]'::jsonb`)
			.$type<string[]>(),

		status: reportStatusEnum("status").notNull().default("pending"),
		rowCount: integer("row_count"),
		fileId: uuid("file_id").references(() => files.id, { onDelete: "set null" }),

		startedAt: timestamp("started_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		errorMessage: text("error_message"),

		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("report_jobs_conf_idx").on(t.conferenceId),
		statusIdx: index("report_jobs_status_idx").on(t.conferenceId, t.status),
		typeIdx: index("report_jobs_type_idx").on(t.conferenceId, t.reportType),
		deletedIdx: index("report_jobs_deleted_idx").on(t.deletedAt),
	}),
);

export type ReportJob = typeof reportJobs.$inferSelect;
export type NewReportJob = typeof reportJobs.$inferInsert;
