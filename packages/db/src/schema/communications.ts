import { sql } from "drizzle-orm";

import {
	boolean,
	index,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";

import { auditColumns, uuidPk } from "./_shared";
import { attendees } from "./attendees";
import { users } from "./auth";
import { conferences } from "./conferences";
import {
	campaignStatusEnum,
	commsChannelEnum,
	commsProviderEnum,
	recipientStatusEnum,
} from "./enums";
import { staff } from "./staff";

export const messagingProviders = pgTable(
	"messaging_providers",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		channel: commsChannelEnum("channel").notNull(),
		provider: commsProviderEnum("provider").notNull(),

		name: text("name").notNull(),
		configEncrypted: text("config_encrypted").notNull(),
		configPublic: jsonb("config_public")
			.notNull()
			.default(sql`'{}'::jsonb`)
			.$type<Record<string, unknown>>(),

		fromAddress: text("from_address"),
		fromName: text("from_name"),

		isDefault: boolean("is_default").notNull().default(false),
		isActive: boolean("is_active").notNull().default(true),

		lastVerifiedAt: timestamp("last_verified_at", { withTimezone: true }),
		lastError: text("last_error"),

		...auditColumns(() => users.id),
	},
	t => ({
		oneDefaultPerChannel: uniqueIndex("messaging_providers_default_unique")
			.on(t.conferenceId, t.channel)
			.where(sql`is_default = true AND deleted_at IS NULL`),
		confChannelIdx: index("messaging_providers_conf_channel_idx").on(t.conferenceId, t.channel),
		deletedIdx: index("messaging_providers_deleted_idx").on(t.deletedAt),
	}),
);

export const messageTemplates = pgTable(
	"message_templates",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		name: text("name").notNull(),
		channel: commsChannelEnum("channel").notNull(),
		subject: text("subject"),
		body: text("body").notNull(),
		variables: jsonb("variables")
			.notNull()
			.default(sql`'[]'::jsonb`)
			.$type<{ key: string; label: string; example: string; required?: boolean }[]>(),
		providerTemplateRef: text("provider_template_ref"),
		isActive: boolean("is_active").notNull().default(true),
		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("message_templates_conf_idx").on(t.conferenceId),
		confChannelIdx: index("message_templates_conf_channel_idx").on(t.conferenceId, t.channel),
		deletedIdx: index("message_templates_deleted_idx").on(t.deletedAt),
	}),
);

export const messageCampaigns = pgTable(
	"message_campaigns",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),

		name: text("name").notNull(),
		channel: commsChannelEnum("channel").notNull(),
		providerId: uuid("provider_id").references(() => messagingProviders.id, {
			onDelete: "set null",
		}),
		templateId: uuid("template_id").references(() => messageTemplates.id, {
			onDelete: "set null",
		}),

		subject: text("subject"),
		body: text("body"),

		audienceFilter: jsonb("audience_filter")
			.notNull()
			.default(sql`'{}'::jsonb`)
			.$type<Record<string, unknown>>(),
		audienceAttendeeIds: uuid("audience_attendee_ids").array(),
		audienceStaffIds: uuid("audience_staff_ids").array(),

		status: campaignStatusEnum("status").notNull().default("draft"),
		scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
		startedAt: timestamp("started_at", { withTimezone: true }),
		completedAt: timestamp("completed_at", { withTimezone: true }),
		cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

		recipientCount: integer("recipient_count").notNull().default(0),
		sentCount: integer("sent_count").notNull().default(0),
		deliveredCount: integer("delivered_count").notNull().default(0),
		openedCount: integer("opened_count").notNull().default(0),
		clickedCount: integer("clicked_count").notNull().default(0),
		failedCount: integer("failed_count").notNull().default(0),
		bouncedCount: integer("bounced_count").notNull().default(0),

		ratePerSecond: integer("rate_per_second"),

		errorSummary: text("error_summary"),

		...auditColumns(() => users.id),
	},
	t => ({
		confIdx: index("message_campaigns_conf_idx").on(t.conferenceId),
		statusIdx: index("message_campaigns_status_idx").on(t.conferenceId, t.status),
		scheduledIdx: index("message_campaigns_scheduled_idx").on(t.scheduledAt),
		deletedIdx: index("message_campaigns_deleted_idx").on(t.deletedAt),
	}),
);

export const messageRecipients = pgTable(
	"message_recipients",
	{
		id: uuidPk(),
		conferenceId: uuid("conference_id")
			.notNull()
			.references(() => conferences.id, { onDelete: "cascade" }),
		campaignId: uuid("campaign_id")
			.notNull()
			.references(() => messageCampaigns.id, { onDelete: "cascade" }),

		attendeeId: uuid("attendee_id").references(() => attendees.id, {
			onDelete: "set null",
		}),
		staffId: uuid("staff_id").references(() => staff.id, {
			onDelete: "set null",
		}),

		channel: commsChannelEnum("channel").notNull(),
		address: text("address").notNull(),
		recipientName: text("recipient_name"),

		renderedSubject: text("rendered_subject"),
		renderedBody: text("rendered_body"),

		status: recipientStatusEnum("status").notNull().default("pending"),
		providerMessageId: text("provider_message_id"),
		errorMessage: text("error_message"),
		retryCount: integer("retry_count").notNull().default(0),

		queuedAt: timestamp("queued_at", { withTimezone: true }),
		sentAt: timestamp("sent_at", { withTimezone: true }),
		deliveredAt: timestamp("delivered_at", { withTimezone: true }),
		openedAt: timestamp("opened_at", { withTimezone: true }),
		clickedAt: timestamp("clicked_at", { withTimezone: true }),
		failedAt: timestamp("failed_at", { withTimezone: true }),

		createdAt: timestamp("created_at", { withTimezone: true })
			.notNull()
			.default(sql`now()`),
	},
	t => ({
		campaignIdx: index("msg_recipients_campaign_idx").on(t.campaignId),
		confStatusIdx: index("msg_recipients_conf_status_idx").on(t.conferenceId, t.status),
		attendeeIdx: index("msg_recipients_attendee_idx").on(t.attendeeId),
		staffIdx: index("msg_recipients_staff_idx").on(t.staffId),
		providerIdIdx: index("msg_recipients_provider_id_idx").on(t.providerMessageId),
	}),
);

export type MessagingProvider = typeof messagingProviders.$inferSelect;
export type NewMessagingProvider = typeof messagingProviders.$inferInsert;
export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type MessageCampaign = typeof messageCampaigns.$inferSelect;
export type NewMessageCampaign = typeof messageCampaigns.$inferInsert;
export type MessageRecipient = typeof messageRecipients.$inferSelect;
