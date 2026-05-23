import {
	bigint,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

import { uuidPk } from "./_shared";
import { users } from "./auth";
import { conferences } from "./conferences";

export const files = pgTable(
	"files",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id").references(() => conferences.id, {
			onDelete: "cascade",
		}),
		uploadedByUserId: text("uploaded_by_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		filename: text("filename").notNull(),
		mimeType: varchar("mime_type", { length: 128 }).notNull(),
		sizeBytes: bigint("size_bytes", { mode: "number" }).notNull().default(0),
		storageBucket: varchar("storage_bucket", { length: 128 }).notNull(),
		storageKey: text("storage_key").notNull(),
		publicUrl: text("public_url"),

		width: integer("width"),
		height: integer("height"),
		durationSeconds: integer("duration_seconds"),

		purpose: varchar("purpose", { length: 64 }),
		checksum: varchar("checksum", { length: 128 }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		deletedAt: timestamp("deleted_at", { withTimezone: true }),
	},
	t => ({
		confIdx: index("files_conf_idx").on(t.conferenceId),
		uploaderIdx: index("files_uploader_idx").on(t.uploadedByUserId),
		purposeIdx: index("files_purpose_idx").on(t.conferenceId, t.purpose),
	}),
);

export type FileRow = typeof files.$inferSelect;
export type NewFile = typeof files.$inferInsert;
