import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { env } from "@/lib/env";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { getClientIp } from "@/lib/http";
import { commsQueue, enqueueJob, JOB_NAMES } from "@/lib/queue";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import {
	attendees,
	messageCampaigns,
	messageRecipients,
	messageTemplates,
	messagingProviders,
} from "@conference/db";
import { encryptJSON } from "@conference/infra";
import {
	audiencePreviewSchema,
	messageCampaignActionSchema,
	messageCampaignCreateSchema,
	messageCampaignUpdateSchema,
	messageTemplateCreateSchema,
	messageTemplateUpdateSchema,
	messagingProviderCreateSchema,
	messagingProviderUpdateSchema,
} from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const providersRouter = new Hono<AppContext>();

providersRouter.get("/", requireRole("admin"), async c => {
	const conf = c.get("conference")!;
	const rows = await withTenant(conf.id, async tx =>
		tx
			.select({
				id: messagingProviders.id,
				name: messagingProviders.name,
				channel: messagingProviders.channel,
				provider: messagingProviders.provider,
				configPublic: messagingProviders.configPublic,
				fromAddress: messagingProviders.fromAddress,
				fromName: messagingProviders.fromName,
				isActive: messagingProviders.isActive,
				isDefault: messagingProviders.isDefault,
				createdAt: messagingProviders.createdAt,
				updatedAt: messagingProviders.updatedAt,
			})
			.from(messagingProviders)
			.where(
				and(
					eq(messagingProviders.conferenceId, conf.id),
					isNull(messagingProviders.deletedAt),
				),
			)
			.orderBy(desc(messagingProviders.createdAt)),
	);
	return c.json({ data: rows });
});

providersRouter.post(
	"/",
	requireRole("admin"),
	zValidator("json", messagingProviderCreateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const input = c.req.valid("json");

		const created = await withTenant(conf.id, async tx => {
			if (input.isDefault) {
				await tx
					.update(messagingProviders)
					.set({ isDefault: false })
					.where(
						and(
							eq(messagingProviders.conferenceId, conf.id),
							eq(messagingProviders.channel, input.channel),
						),
					);
			}
			const [row] = await tx
				.insert(messagingProviders)
				.values({
					conferenceId: conf.id,
					name: input.name,
					channel: input.channel,
					provider: input.provider,
					configEncrypted: encryptJSON(input.config, {
						encryptionKey: env.ENCRYPTION_KEY,
					}),
					configPublic: input.configPublic ?? {},
					fromAddress: input.fromAddress,
					fromName: input.fromName,
					isDefault: input.isDefault ?? false,
					createdBy: user.id,
					updatedBy: user.id,
				})
				.returning({
					id: messagingProviders.id,
					name: messagingProviders.name,
					channel: messagingProviders.channel,
					provider: messagingProviders.provider,
					configPublic: messagingProviders.configPublic,
					isActive: messagingProviders.isActive,
					isDefault: messagingProviders.isDefault,
					createdAt: messagingProviders.createdAt,
				});
			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "create",
				entity: "messaging_provider",
				entityId: row!.id,
				after: { ...row, configEncrypted: "***" },
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
			return row;
		});
		return c.json({ data: created }, 201);
	},
);

providersRouter.patch(
	"/:id",
	requireRole("admin"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator("json", messagingProviderUpdateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		const input = c.req.valid("json");

		const updated = await withTenant(conf.id, async tx => {
			const [before] = await tx
				.select()
				.from(messagingProviders)
				.where(
					and(
						eq(messagingProviders.id, id),
						eq(messagingProviders.conferenceId, conf.id),
					),
				)
				.limit(1);
			if (!before) throw new NotFoundError("provider");

			if (input.isDefault === true && before.channel) {
				await tx
					.update(messagingProviders)
					.set({ isDefault: false })
					.where(
						and(
							eq(messagingProviders.conferenceId, conf.id),
							eq(messagingProviders.channel, before.channel),
						),
					);
			}

			const next: Record<string, any> = {
				updatedBy: user.id,
				updatedAt: new Date(),
			};
			if (typeof input.name === "string") next.name = input.name;
			if (typeof input.fromAddress === "string") next.fromAddress = input.fromAddress;
			if (typeof input.fromName === "string") next.fromName = input.fromName;
			if (typeof input.configPublic === "object") next.configPublic = input.configPublic;
			if (typeof input.isActive === "boolean") next.isActive = input.isActive;
			if (typeof input.isDefault === "boolean") next.isDefault = input.isDefault;
			if (input.config !== undefined)
				next.configEncrypted = encryptJSON(input.config, {
					encryptionKey: env.ENCRYPTION_KEY,
				});

			const [row] = await tx
				.update(messagingProviders)
				.set(next)
				.where(eq(messagingProviders.id, id))
				.returning({
					id: messagingProviders.id,
					name: messagingProviders.name,
					channel: messagingProviders.channel,
					provider: messagingProviders.provider,
					configPublic: messagingProviders.configPublic,
					isActive: messagingProviders.isActive,
					isDefault: messagingProviders.isDefault,
					updatedAt: messagingProviders.updatedAt,
				});

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "update",
				entity: "messaging_provider",
				entityId: id,
				meta: { configChanged: input.config !== undefined },
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
			return row;
		});

		return c.json({ data: updated });
	},
);

providersRouter.delete(
	"/:id",
	requireRole("admin"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		await withTenant(conf.id, async tx => {
			await tx
				.update(messagingProviders)
				.set({ deletedAt: new Date(), deletedBy: user.id })
				.where(
					and(
						eq(messagingProviders.id, id),
						eq(messagingProviders.conferenceId, conf.id),
					),
				);
			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "delete",
				entity: "messaging_provider",
				entityId: id,
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
		});
		return c.json({ deleted: true });
	},
);

export const templatesRouter = new Hono<AppContext>();

templatesRouter.get("/", requireRole("editor"), async c => {
	const conf = c.get("conference")!;
	const url = new URL(c.req.url);
	const channel = url.searchParams.get("channel");
	const rows = await withTenant(conf.id, async tx => {
		const parts: any[] = [
			eq(messageTemplates.conferenceId, conf.id),
			isNull(messageTemplates.deletedAt),
		];
		if (channel) parts.push(eq(messageTemplates.channel, channel as any));
		return tx
			.select()
			.from(messageTemplates)
			.where(and(...parts));
	});
	return c.json({ data: rows });
});

templatesRouter.post(
	"/",
	requireRole("editor"),
	zValidator("json", messageTemplateCreateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const input = c.req.valid("json");
		const [row] = await withTenant(conf.id, async tx =>
			tx
				.insert(messageTemplates)
				.values({
					...input,
					conferenceId: conf.id,
					createdBy: user.id,
					updatedBy: user.id,
				})
				.returning(),
		);
		return c.json({ data: row }, 201);
	},
);

templatesRouter.patch(
	"/:id",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator("json", messageTemplateUpdateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		const input = c.req.valid("json");
		const [row] = await withTenant(conf.id, async tx =>
			tx
				.update(messageTemplates)
				.set({ ...input, updatedBy: user.id, updatedAt: new Date() })
				.where(and(eq(messageTemplates.id, id), eq(messageTemplates.conferenceId, conf.id)))
				.returning(),
		);
		if (!row) throw new NotFoundError("template");
		return c.json({ data: row });
	},
);

templatesRouter.delete(
	"/:id",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		await withTenant(conf.id, async tx =>
			tx
				.update(messageTemplates)
				.set({ deletedAt: new Date(), deletedBy: user.id })
				.where(
					and(eq(messageTemplates.id, id), eq(messageTemplates.conferenceId, conf.id)),
				),
		);
		return c.json({ deleted: true });
	},
);

function attendeeFilterWhere(conferenceId: string, filter: Record<string, any>) {
	const parts: any[] = [eq(attendees.conferenceId, conferenceId), isNull(attendees.deletedAt)];
	if (Array.isArray(filter.category) && filter.category.length)
		parts.push(inArray(attendees.category, filter.category));
	if (filter.gender) parts.push(eq(attendees.gender, filter.gender));
	if (Array.isArray(filter.prantha) && filter.prantha.length)
		parts.push(inArray(attendees.prantha, filter.prantha));
	if (Array.isArray(filter.city) && filter.city.length)
		parts.push(inArray(attendees.city, filter.city));
	if (Array.isArray(filter.state) && filter.state.length)
		parts.push(inArray(attendees.state, filter.state));
	if (Array.isArray(filter.tags) && filter.tags.length)
		parts.push(sql`${attendees.tags} && ${filter.tags}::text[]`);
	if (Array.isArray(filter.registrationStatus) && filter.registrationStatus.length)
		parts.push(inArray(attendees.registrationStatus, filter.registrationStatus));
	if (Array.isArray(filter.checkinStatus) && filter.checkinStatus.length)
		parts.push(inArray(attendees.checkinStatus, filter.checkinStatus));
	if (typeof filter.isVip === "boolean") parts.push(eq(attendees.isVip, filter.isVip));
	return parts;
}

export const campaignsRouter = new Hono<AppContext>();

campaignsRouter.get("/", requireRole("editor"), async c => {
	const conf = c.get("conference")!;
	const rows = await withTenant(conf.id, async tx =>
		tx
			.select({
				id: messageCampaigns.id,
				name: messageCampaigns.name,
				channel: messageCampaigns.channel,
				providerId: messageCampaigns.providerId,
				templateId: messageCampaigns.templateId,
				subject: messageCampaigns.subject,
				body: messageCampaigns.body,
				audienceFilter: messageCampaigns.audienceFilter,
				status: messageCampaigns.status,
				scheduledAt: messageCampaigns.scheduledAt,
				startedAt: messageCampaigns.startedAt,
				completedAt: messageCampaigns.completedAt,
				cancelledAt: messageCampaigns.cancelledAt,
				recipientCount: messageCampaigns.recipientCount,
				sentCount: messageCampaigns.sentCount,
				deliveredCount: messageCampaigns.deliveredCount,
				openedCount: messageCampaigns.openedCount,
				clickedCount: messageCampaigns.clickedCount,
				failedCount: messageCampaigns.failedCount,
				bouncedCount: messageCampaigns.bouncedCount,
				ratePerSecond: messageCampaigns.ratePerSecond,
				errorSummary: messageCampaigns.errorSummary,
			})
			.from(messageCampaigns)
			.where(
				and(eq(messageCampaigns.conferenceId, conf.id), isNull(messageCampaigns.deletedAt)),
			)
			.orderBy(desc(messageCampaigns.createdAt)),
	);
	return c.json({ data: rows });
});

campaignsRouter.post(
	"/",
	requireRole("admin"),
	zValidator("json", messageCampaignCreateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const input = c.req.valid("json");
		const [row] = await withTenant(conf.id, async tx =>
			tx
				.insert(messageCampaigns)
				.values({
					...input,
					scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : null,
					ratePerSecond:
						input.ratePerSecond ??
						(input.channel === "email"
							? env.COMMS_EMAIL_RATE_PER_SEC
							: input.channel === "sms"
								? env.COMMS_SMS_RATE_PER_SEC
								: env.COMMS_WA_RATE_PER_SEC),
					conferenceId: conf.id,
					status: "draft",
					createdBy: user.id,
					updatedBy: user.id,
				})
				.returning(),
		);
		return c.json({ data: row }, 201);
	},
);

campaignsRouter.patch(
	"/:id",
	requireRole("admin"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator("json", messageCampaignUpdateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		const input = c.req.valid("json");
		const [row] = await withTenant(conf.id, async tx =>
			tx
				.update(messageCampaigns)
				.set({
					...input,
					scheduledAt: input.scheduledAt ? new Date(input.scheduledAt) : undefined,
					updatedBy: user.id,
					updatedAt: new Date(),
				})
				.where(and(eq(messageCampaigns.id, id), eq(messageCampaigns.conferenceId, conf.id)))
				.returning(),
		);
		if (!row) throw new NotFoundError("campaign");
		return c.json({ data: row });
	},
);

campaignsRouter.post(
	"/audience-preview",
	requireRole("editor"),
	zValidator("json", audiencePreviewSchema),
	async c => {
		const conf = c.get("conference")!;
		const input = c.req.valid("json");
		const result = await withTenant(conf.id, async tx => {
			const filter = (input.audienceFilter ?? {}) as Record<string, any>;
			let parts = attendeeFilterWhere(conf.id, filter);
			if (input.audienceAttendeeIds?.length) {
				parts = parts.concat([inArray(attendees.id, input.audienceAttendeeIds)]);
			}
			const where = and(...parts);
			const countRows = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(attendees)
				.where(where);
			const sample = await tx
				.select({
					id: attendees.id,
					name: attendees.name,
					email: attendees.email,
					phone: attendees.phone,
					whatsapp: attendees.whatsapp,
					category: attendees.category,
					gender: attendees.gender,
					attendeeCode: attendees.attendeeCode,
				})
				.from(attendees)
				.where(where)
				.limit(input.limit);
			return { count: countRows[0]?.n ?? 0, sample };
		});
		return c.json(result);
	},
);

campaignsRouter.post(
	"/:id/action",
	requireRole("admin"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator("json", messageCampaignActionSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		const { action, scheduledAt } = c.req.valid("json");

		const result = await withTenant(conf.id, async tx => {
			const [camp] = await tx
				.select()
				.from(messageCampaigns)
				.where(and(eq(messageCampaigns.id, id), eq(messageCampaigns.conferenceId, conf.id)))
				.limit(1);
			if (!camp) throw new NotFoundError("campaign");

			if (action === "cancel") {
				if (camp.status === "completed" || camp.status === "cancelled") {
					throw new BadRequestError(`Cannot cancel ${camp.status} campaign`);
				}
				await tx
					.update(messageCampaigns)
					.set({
						status: "cancelled",
						cancelledAt: new Date(),
						updatedBy: user.id,
						updatedAt: new Date(),
					})
					.where(eq(messageCampaigns.id, id));
				return { status: "cancelled" };
			}

			if (action === "schedule") {
				if (!scheduledAt) throw new BadRequestError("ScheduledAt is required");
				await tx
					.update(messageCampaigns)
					.set({
						status: "scheduled",
						scheduledAt: new Date(scheduledAt),
						updatedBy: user.id,
						updatedAt: new Date(),
					})
					.where(eq(messageCampaigns.id, id));
				return { status: "scheduled" };
			}

			if (action === "send_now") {
				if (camp.status !== "draft" && camp.status !== "scheduled") {
					throw new BadRequestError(`Cannot send a ${camp.status} campaign`);
				}
				await tx
					.update(messageCampaigns)
					.set({
						status: "materialising",
						startedAt: new Date(),
						updatedBy: user.id,
						updatedAt: new Date(),
					})
					.where(eq(messageCampaigns.id, id));
				return { status: "materialising", enqueue: true };
			}

			if (action === "duplicate") {
				const [copy] = await tx
					.insert(messageCampaigns)
					.values({
						...camp,
						id: undefined as any,
						name: `${camp.name} (copy)`,
						status: "draft",
						startedAt: null,
						completedAt: null,
						cancelledAt: null,
						sentCount: 0,
						deliveredCount: 0,
						openedCount: 0,
						clickedCount: 0,
						failedCount: 0,
						createdAt: undefined as any,
						updatedAt: undefined as any,
						createdBy: user.id,
						updatedBy: user.id,
					})
					.returning();
				return { duplicatedId: copy!.id };
			}

			return {};
		});

		if ("enqueue" in result && result.enqueue) {
			await enqueueJob(commsQueue, JOB_NAMES.CAMPAIGN_MATERIALISE, {
				campaignId: id,
				conferenceId: conf.id,
			});
			await recordAudit(c.get("conference") ? (undefined as any) : (undefined as any), {
				conferenceId: conf.id,
				userId: user.id,
				action: "send_campaign",
				entity: "message_campaign",
				entityId: id,
				meta: { stage: "queued" },
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			} as any);
		}

		return c.json(result);
	},
);

campaignsRouter.get(
	"/:id/recipients",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator(
		"query",
		z.object({
			status: z
				.enum([
					"queued",
					"sending",
					"sent",
					"delivered",
					"failed",
					"bounced",
					"opened",
					"clicked",
				])
				.optional(),
			page: z.coerce.number().int().min(1).default(1),
			pageSize: z.coerce.number().int().min(1).max(200).default(50),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const { id } = c.req.valid("param");
		const q = c.req.valid("query");
		const offset = (q.page - 1) * q.pageSize;
		const result = await withTenant(conf.id, async tx => {
			const parts: any[] = [
				eq(messageRecipients.campaignId, id),
				eq(messageRecipients.conferenceId, conf.id),
			];
			if (q.status) parts.push(eq(messageRecipients.status, q.status));
			const data = await tx
				.select()
				.from(messageRecipients)
				.where(and(...parts))
				.orderBy(desc(messageRecipients.createdAt))
				.limit(q.pageSize)
				.offset(offset);
			const countRows = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(messageRecipients)
				.where(and(...parts));
			return { data, total: countRows[0]?.n ?? 0 };
		});
		return c.json({
			data: result.data,
			pagination: {
				page: q.page,
				pageSize: q.pageSize,
				total: result.total,
				totalPages: Math.max(1, Math.ceil(result.total / q.pageSize)),
				hasNextPage: q.page * q.pageSize < result.total,
			},
		});
	},
);

campaignsRouter.delete(
	"/:id",
	requireRole("admin"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		await withTenant(conf.id, async tx => {
			const [before] = await tx
				.select()
				.from(messageCampaigns)
				.where(and(eq(messageCampaigns.id, id), eq(messageCampaigns.conferenceId, conf.id)))
				.limit(1);
			if (!before) throw new NotFoundError("campaign");
			await tx
				.update(messageCampaigns)
				.set({ deletedAt: new Date(), deletedBy: user.id })
				.where(eq(messageCampaigns.id, id));
			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "delete",
				entity: "message_campaign",
				entityId: id,
				before,
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
		});
		return c.json({ deleted: true });
	},
);
