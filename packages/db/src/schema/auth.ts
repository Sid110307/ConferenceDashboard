import { uuidPk } from "@/schema/_shared";
import { auditActionEnum, userRoleEnum } from "@/schema/enums";
import { sql } from "drizzle-orm";

import {
	boolean,
	customType,
	index,
	inet,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from "drizzle-orm/pg-core";

const citext = customType<{ data: string; driverData: string }>({
	dataType() {
		return "citext";
	},
});

export const users = pgTable(
	"users",
	{
		id: uuidPk(),
		email: citext("email").notNull(),
		emailVerified: timestamp("email_verified", { withTimezone: true }),
		name: text("name"),
		image: text("image"),
		hashedPassword: text("hashed_password"), // null for pure OAuth users
		isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
		isActive: boolean("is_active").notNull().default(true),
		lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
		twoFactorEnabled: boolean("two_factor_enabled").notNull().default(false),
		twoFactorSecret: text("two_factor_secret"),
		preferences: jsonb("preferences")
			.notNull()
			.default(sql`'{}'::jsonb`)
			.$type<Record<string, unknown>>(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	t => ({
		emailUnique: uniqueIndex("users_email_unique").on(t.email),
		activeIdx: index("users_active_idx").on(t.isActive),
	}),
);

export const accounts = pgTable(
	"accounts",
	{
		id: uuidPk(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		provider: varchar("provider", { length: 32 }).notNull(), // 'google' | 'github' | ...
		providerAccountId: varchar("provider_account_id", { length: 191 }).notNull(),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		idToken: text("id_token"),
		tokenType: varchar("token_type", { length: 32 }),
		scope: text("scope"),
		expiresAt: timestamp("expires_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	t => ({
		providerAccountUnique: uniqueIndex("accounts_provider_account_unique").on(
			t.provider,
			t.providerAccountId,
		),
		userIdx: index("accounts_user_idx").on(t.userId),
	}),
);

export const sessions = pgTable(
	"sessions",
	{
		id: uuidPk(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		ip: inet("ip"),
		userAgent: text("user_agent"),
		activeConferenceId: uuid("active_conference_id"),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
		lastUsedAt: timestamp("last_used_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	t => ({
		userIdx: index("sessions_user_idx").on(t.userId),
		expiresIdx: index("sessions_expires_idx").on(t.expiresAt),
	}),
);

export const verificationTokens = pgTable(
	"verification_tokens",
	{
		id: uuidPk(),
		identifier: text("identifier").notNull(),
		tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
		purpose: varchar("purpose", { length: 32 }).notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		consumedAt: timestamp("consumed_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	t => ({
		identifierIdx: index("verification_tokens_identifier_idx").on(t.identifier),
		expiresIdx: index("verification_tokens_expires_idx").on(t.expiresAt),
	}),
);

export const userConferenceRoles = pgTable(
	"user_conference_roles",
	{
		id: uuidPk(),
		userId: uuid("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		conferenceId: uuid("conference_id").notNull(),
		role: userRoleEnum("role").notNull(),
		isActive: boolean("is_active").notNull().default(true),
		invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		invitedAt: timestamp("invited_at", { withTimezone: true }),
		acceptedAt: timestamp("accepted_at", { withTimezone: true }),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		permissions: jsonb("permissions")
			.notNull()
			.default(sql`'{}'::jsonb`)
			.$type<Record<string, boolean>>(),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
		updatedAt: timestamp("updated_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	t => ({
		uniqueUserConf: uniqueIndex("ucr_user_conference_unique").on(t.userId, t.conferenceId),
		conferenceIdx: index("ucr_conference_idx").on(t.conferenceId),
		userActiveIdx: index("ucr_user_active_idx").on(t.userId, t.isActive),
	}),
);

export const invitations = pgTable(
	"invitations",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id").notNull(),
		email: citext("email").notNull(),
		role: userRoleEnum("role").notNull(),
		tokenHash: varchar("token_hash", { length: 128 }).notNull().unique(),
		invitedByUserId: uuid("invited_by_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		acceptedAt: timestamp("accepted_at", { withTimezone: true }),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	t => ({
		confEmailIdx: index("invitations_conf_email_idx").on(t.conferenceId, t.email),
	}),
);

export const auditLog = pgTable(
	"audit_log",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id"),
		userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
		action: auditActionEnum("action").notNull(),
		entity: varchar("entity", { length: 64 }).notNull(),
		entityId: uuid("entity_id"),
		changes: jsonb("changes")
			.notNull()
			.default(sql`'{}'::jsonb`)
			.$type<{ before?: unknown; after?: unknown; meta?: unknown }>(),
		ip: inet("ip"),
		userAgent: text("user_agent"),
		requestId: varchar("request_id", { length: 64 }),
		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	t => ({
		confIdx: index("audit_log_conf_idx").on(t.conferenceId, t.createdAt),
		entityIdx: index("audit_log_entity_idx").on(t.entity, t.entityId),
		userIdx: index("audit_log_user_idx").on(t.userId, t.createdAt),
	}),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Account = typeof accounts.$inferSelect;
export type Session = typeof sessions.$inferSelect;
export type VerificationToken = typeof verificationTokens.$inferSelect;
export type UserConferenceRole = typeof userConferenceRoles.$inferSelect;
export type NewUserConferenceRole = typeof userConferenceRoles.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type AuditLogEntry = typeof auditLog.$inferSelect;
export type NewAuditLogEntry = typeof auditLog.$inferInsert;
