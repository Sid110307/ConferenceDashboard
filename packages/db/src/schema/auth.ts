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

import { uuidPk } from "./_shared";
import { auditActionEnum, userRoleEnum } from "./enums";

const citext = customType<{ data: string; driverData: string }>({
	dataType() {
		return "citext";
	},
});

export const users = pgTable(
	"users",
	{
		id: text("id")
			.primaryKey()
			.notNull()
			.default(sql`gen_random_uuid()::text`),
		name: text("name").notNull(),
		email: citext("email").notNull(),
		emailVerified: boolean("email_verified").default(false).notNull(),
		image: text("image"),
		isPlatformAdmin: boolean("is_platform_admin").notNull().default(false),
		isActive: boolean("is_active").notNull().default(true),
		lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
		preferences: jsonb("preferences")
			.notNull()
			.default(sql`'{}'::jsonb`)
			.$type<Record<string, unknown>>(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	t => ({
		emailUnique: uniqueIndex("users_email_unique").on(t.email),
		activeIdx: index("users_active_idx").on(t.isActive),
	}),
);

export const accounts = pgTable(
	"accounts",
	{
		id: text("id").primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		accountId: text("account_id").notNull(),
		providerId: text("provider_id").notNull(),
		accessToken: text("access_token"),
		refreshToken: text("refresh_token"),
		accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
		refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
		scope: text("scope"),
		idToken: text("id_token"),
		password: text("password"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	t => ({
		userProviderIdx: index("accounts_user_provider_idx").on(t.userId, t.providerId),
	}),
);

export const sessions = pgTable(
	"sessions",
	{
		id: text("id").primaryKey().notNull(),
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		token: text("token").notNull().unique(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		ipAddress: text("ip_address"),
		userAgent: text("user_agent"),
		activeConferenceId: uuid("active_conference_id"),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
	},
	t => ({
		userIdx: index("sessions_user_idx").on(t.userId),
		expiresIdx: index("sessions_expires_idx").on(t.expiresAt),
	}),
);

export const verificationTokens = pgTable(
	"verification_tokens",
	{
		id: text("id").primaryKey().notNull(),
		identifier: text("identifier").notNull(),
		value: text("value").notNull(),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
		userId: text("user_id")
			.notNull()
			.references(() => users.id, { onDelete: "cascade" }),
		conferenceId: uuid("conference_id").notNull(),
		role: userRoleEnum("role").notNull(),
		isActive: boolean("is_active").notNull().default(true),
		invitedByUserId: text("invited_by_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		invitedAt: timestamp("invited_at", { withTimezone: true }),
		acceptedAt: timestamp("accepted_at", { withTimezone: true }),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		permissions: jsonb("permissions")
			.notNull()
			.default(sql`'{}'::jsonb`)
			.$type<Record<string, boolean>>(),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
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
		invitedByUserId: text("invited_by_user_id").references(() => users.id, {
			onDelete: "set null",
		}),
		expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
		acceptedAt: timestamp("accepted_at", { withTimezone: true }),
		revokedAt: timestamp("revoked_at", { withTimezone: true }),
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
		userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
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
		createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
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
