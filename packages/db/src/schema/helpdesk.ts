import { auditColumns, customFieldsColumn, uuidPk } from "./_shared";
import { attendees } from "./attendees";
import { users } from "./auth";
import { conferences } from "./conferences";
import { helpdeskCategoryEnum, issueStatusEnum, priorityEnum } from "./enums";
import { committees, staff } from "./staff";

import { index, pgTable, text, timestamp, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";

export const helpdeskIssues = pgTable(
	"helpdesk_issues",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),

		issueCode: varchar("issue_code", { length: 32 }).notNull(),

		attendeeId: uuid("attendee_id").references(() => attendees.id, {
			onDelete: "set null",
		}),
		reportedByName: text("reported_by_name"),
		reportedByPhone: text("reported_by_phone"),
		reporterType: varchar("reporter_type", { length: 32 }).notNull().default("attendee"),

		category: helpdeskCategoryEnum("category").notNull().default("other"),
		title: text("title").notNull(),
		description: text("description"),
		priority: priorityEnum("priority").notNull().default("medium"),
		status: issueStatusEnum("status").notNull().default("open"),

		assignedToStaffId: uuid("assigned_to_staff_id").references(() => staff.id, {
			onDelete: "set null",
		}),
		assignedCommitteeId: uuid("assigned_committee_id").references(() => committees.id, {
			onDelete: "set null",
		}),
		assignedAt: timestamp("assigned_at", { withTimezone: true }),

		acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
		resolvedAt: timestamp("resolved_at", { withTimezone: true }),
		closedAt: timestamp("closed_at", { withTimezone: true }),
		resolutionNotes: text("resolution_notes"),

		notes: text("notes"),

		...customFieldsColumn(),
		...auditColumns(() => users.id),
	},
	t => ({
		confCodeUnique: uniqueIndex("helpdesk_conf_code_unique").on(t.conferenceId, t.issueCode),
		confIdx: index("helpdesk_conf_idx").on(t.conferenceId),
		confStatusIdx: index("helpdesk_conf_status_idx").on(t.conferenceId, t.status),
		confPriorityIdx: index("helpdesk_conf_priority_idx").on(t.conferenceId, t.priority),
		assignedStaffIdx: index("helpdesk_assigned_staff_idx").on(t.assignedToStaffId),
		assignedCommitteeIdx: index("helpdesk_assigned_committee_idx").on(t.assignedCommitteeId),
		deletedIdx: index("helpdesk_deleted_idx").on(t.deletedAt),
	}),
);

export type HelpdeskIssue = typeof helpdeskIssues.$inferSelect;
export type NewHelpdeskIssue = typeof helpdeskIssues.$inferInsert;
