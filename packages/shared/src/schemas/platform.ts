import {
	COMMS_CHANNELS,
	COMMS_PROVIDERS,
	CUSTOM_FIELD_ENTITIES,
	CUSTOM_FIELD_TYPES,
	IMPORT_ENTITIES,
	type CommsChannel,
	type CommsProvider,
	type CustomFieldEntity,
	type CustomFieldType,
	type ImportEntity,
} from "@/constants";
import { isoDatetimeSchema, uuidSchema } from "@/schemas/common";
import { z } from "zod";

const channelEnum = z.enum(COMMS_CHANNELS as readonly [CommsChannel, ...CommsChannel[]]);
const providerEnum = z.enum(COMMS_PROVIDERS as readonly [CommsProvider, ...CommsProvider[]]);

export const messagingProviderCreateSchema = z.object({
	name: z.string().min(1).max(120),
	channel: channelEnum,
	provider: providerEnum,
	config: z.record(z.string(), z.any()),
	configPublic: z.record(z.string(), z.any()).default({}),
	fromAddress: z.string().max(255).optional(),
	fromName: z.string().max(255).optional(),
	isDefault: z.boolean().default(false),
});

export const messagingProviderUpdateSchema = messagingProviderCreateSchema
	.partial()
	.extend({ isActive: z.boolean().optional() });

export const messageTemplateCreateSchema = z.object({
	name: z.string().min(1).max(120),
	channel: channelEnum,
	subject: z.string().max(255).optional(),
	body: z.string().min(1).max(50000),
	variables: z
		.array(
			z.object({
				key: z.string().regex(/^[a-z][a-z0-9_]*$/, "must be a snake_case identifier"),
				label: z.string().max(120),
				example: z.string().max(200).default(""),
				required: z.boolean().optional(),
			}),
		)
		.default([]),
	providerTemplateRef: z.string().max(255).optional(),
});

export const messageTemplateUpdateSchema = messageTemplateCreateSchema
	.partial()
	.extend({ isActive: z.boolean().optional() });

export const audienceFilterSchema = z
	.object({
		category: z.array(z.string()).optional(),
		gender: z.string().optional(),
		prantha: z.array(z.string()).optional(),
		city: z.array(z.string()).optional(),
		state: z.array(z.string()).optional(),
		tags: z.array(z.string()).optional(),
		registrationStatus: z.array(z.string()).optional(),
		checkinStatus: z.array(z.string()).optional(),
		isVip: z.boolean().optional(),
		customFields: z.record(z.string(), z.any()).optional(),
	})
	.partial();

export const messageCampaignCreateSchema = z.object({
	name: z.string().min(1).max(255),
	channel: channelEnum,
	providerId: uuidSchema.optional(),
	templateId: uuidSchema.optional(),
	subject: z.string().max(255).optional(),
	body: z.string().max(50000).optional(),
	audienceFilter: audienceFilterSchema.default({}),
	audienceAttendeeIds: z.array(uuidSchema).optional(),
	audienceStaffIds: z.array(uuidSchema).optional(),
	scheduledAt: isoDatetimeSchema.optional(),
	ratePerSecond: z.number().int().min(1).max(500).optional(),
});

export const messageCampaignUpdateSchema = messageCampaignCreateSchema.partial();

export const messageCampaignActionSchema = z.object({
	action: z.enum(["send_now", "schedule", "cancel", "duplicate", "preview"]),
	scheduledAt: isoDatetimeSchema.optional(),
});

export const audiencePreviewSchema = z.object({
	channel: channelEnum,
	audienceFilter: audienceFilterSchema.optional(),
	audienceAttendeeIds: z.array(uuidSchema).optional(),
	audienceStaffIds: z.array(uuidSchema).optional(),
	limit: z.number().int().min(1).max(200).default(50),
});

export const importJobCreateSchema = z.object({
	targetEntity: z.enum(IMPORT_ENTITIES as readonly [ImportEntity, ...ImportEntity[]]),
	fileId: uuidSchema,
});

export const importJobMappingSchema = z.object({
	mapping: z.record(z.string(), z.string()),
	options: z
		.object({
			dedupe_by: z.array(z.string()).optional(),
			on_duplicate: z.enum(["skip", "update", "error", "create_anyway"]).optional(),
			update_existing: z.boolean().optional(),
			trim_whitespace: z.boolean().optional(),
			empty_string_as_null: z.boolean().optional(),
			default_values: z.record(z.string(), z.any()).optional(),
		})
		.default({}),
});

export const importJobActionSchema = z.object({
	action: z.enum(["preview", "start", "cancel", "rollback"]),
});

export const customFieldDefinitionSchema = z.object({
	entity: z.enum(CUSTOM_FIELD_ENTITIES as readonly [CustomFieldEntity, ...CustomFieldEntity[]]),
	fieldKey: z
		.string()
		.regex(/^[a-z][a-z0-9_]*$/, "must be a snake_case identifier")
		.max(64),
	fieldLabel: z.string().min(1).max(255),
	fieldType: z.enum(CUSTOM_FIELD_TYPES as readonly [CustomFieldType, ...CustomFieldType[]]),
	isRequired: z.boolean().default(false),
	isUnique: z.boolean().default(false),
	isVisibleInList: z.boolean().default(false),
	isSearchable: z.boolean().default(false),
	defaultValue: z.string().max(500).optional(),
	placeholder: z.string().max(255).optional(),
	helpText: z.string().max(500).optional(),
	options: z
		.array(
			z.object({
				value: z.string().min(1).max(120),
				label: z.string().min(1).max(255),
				color: z.string().max(16).optional(),
			}),
		)
		.default([]),
	validation: z
		.object({
			regex: z.string().optional(),
			min: z.number().optional(),
			max: z.number().optional(),
			minLength: z.number().int().optional(),
			maxLength: z.number().int().optional(),
		})
		.default({}),
	groupName: z.string().max(64).optional(),
	sortOrder: z.number().int().default(0),
});

export const customFieldDefinitionUpdateSchema = customFieldDefinitionSchema
	.partial()
	.extend({ isActive: z.boolean().optional() });

export const reportJobCreateSchema = z.object({
	reportType: z.enum([
		"attendee_master",
		"attendee_by_category",
		"travel_manifest_arrivals",
		"travel_manifest_departures",
		"travel_manifest_male",
		"travel_manifest_female",
		"accommodation_plan",
		"daily_control",
		"finance_summary",
		"food_counts",
		"committee_directory",
		"vip_report",
		"helpdesk_report",
		"custom",
	]),
	name: z.string().min(1).max(255),
	format: z.enum(["csv", "xlsx", "pdf", "json"]).default("xlsx"),
	filters: z.record(z.string(), z.any()).default({}),
	columns: z.array(z.string()).default([]),
});

export type MessagingProviderInput = z.infer<typeof messagingProviderCreateSchema>;
export type MessageTemplateInput = z.infer<typeof messageTemplateCreateSchema>;
export type MessageCampaignInput = z.infer<typeof messageCampaignCreateSchema>;
export type AudienceFilter = z.infer<typeof audienceFilterSchema>;
export type AudiencePreviewInput = z.infer<typeof audiencePreviewSchema>;
export type ImportJobCreateInput = z.infer<typeof importJobCreateSchema>;
export type ImportJobMappingInput = z.infer<typeof importJobMappingSchema>;
export type CustomFieldDefinitionInput = z.infer<typeof customFieldDefinitionSchema>;
export type ReportJobCreateInput = z.infer<typeof reportJobCreateSchema>;
