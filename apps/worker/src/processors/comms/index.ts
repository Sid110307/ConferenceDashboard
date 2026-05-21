import { decryptJSON } from "@/lib/crypto";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import { attendees, messageCampaigns, messageRecipients, messageTemplates, messagingProviders, } from "@conference/db";
import { LIMITS } from "@conference/shared";

import { db, withTenant } from "@/lib/tenancy";
import { logger } from "@/lib/logger";
import { decryptJSON } from "@/lib/crypto";
import { JOB_NAMES, redis } from "@/lib/redis";
import { Queue } from "bullmq";
import { notifyConference } from "@/lib/notify";
import { sendMessage } from "@/processors/comms/providers";
import { env } from "@/lib/env";

const commsQueue = new Queue("comms", { connection: redis });

export async function processCampaignMaterialise(payload: {
	campaignId: string;
	conferenceId: string;
}) {
	const { campaignId, conferenceId } = payload;

	const camp = await db
		.select()
		.from(messageCampaigns)
		.where(eq(messageCampaigns.id, campaignId))
		.limit(1)
		.then(r => r[0]);
	if (!camp) throw new Error(`campaign ${campaignId} not found`);

	let total = 0;
	const BATCH = LIMITS.IMPORT_BATCH_SIZE;

	await withTenant(conferenceId, async tx => {
		const filter = (camp.audienceFilter ?? {}) as Record<string, any>;
		const ids = (camp.audienceAttendeeIds ?? []) as string[];

		const parts: any[] = [
			eq(attendees.conferenceId, conferenceId),
			isNull(attendees.deletedAt),
		];
		if (ids.length) parts.push(inArray(attendees.id, ids));
		if (Array.isArray(filter.category) && filter.category.length)
			parts.push(inArray(attendees.category, filter.category));
		if (filter.gender) parts.push(eq(attendees.gender, filter.gender));
		if (Array.isArray(filter.prantha) && filter.prantha.length)
			parts.push(inArray(attendees.prantha, filter.prantha));
		if (Array.isArray(filter.registrationStatus) && filter.registrationStatus.length)
			parts.push(inArray(attendees.registrationStatus, filter.registrationStatus));
		if (typeof filter.isVip === "boolean") parts.push(eq(attendees.isVip, filter.isVip));
		if (Array.isArray(filter.tags) && filter.tags.length)
			parts.push(sql`${attendees.tags} && ${filter.tags}::text[]`);

		const contactCol =
			camp.channel === "email"
				? attendees.email
				: camp.channel === "sms"
					? attendees.phone
					: attendees.whatsapp;
		parts.push(sql`${contactCol} IS NOT NULL`);

		const audience = await tx
			.select({
				id: attendees.id,
				name: attendees.name,
				contact: contactCol,
			})
			.from(attendees)
			.where(and(...parts));

		total = audience.length;
		if (total === 0) {
			await tx
				.update(messageCampaigns)
				.set({
					status: "completed",
					totalRecipients: 0,
					completedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(messageCampaigns.id, campaignId));
			return;
		}

		for (let i = 0; i < audience.length; i += BATCH) {
			const slice = audience.slice(i, i + BATCH);
			await tx.insert(messageRecipients).values(
				slice.map(a => ({
					conferenceId,
					campaignId,
					attendeeId: a.id,
					channel: camp.channel,
					toAddress: String(a.contact),
					status: "queued" as const,
					createdAt: new Date(),
				})),
			);
		}

		await tx
			.update(messageCampaigns)
			.set({
				status: "sending",
				totalRecipients: total,
				updatedAt: new Date(),
			})
			.where(eq(messageCampaigns.id, campaignId));

		await notifyConference(tx, conferenceId, {
			type: "campaign.materialised",
			entity: "message_campaign",
			id: campaignId,
			meta: { total },
		});
	});

	const recipients = await db
		.select({ id: messageRecipients.id })
		.from(messageRecipients)
		.where(eq(messageRecipients.campaignId, campaignId));

	const batch = 50;
	for (let i = 0; i < recipients.length; i += batch) {
		const slice = recipients.slice(i, i + batch).map(r => r.id);
		await commsQueue.add(
			JOB_NAMES.CAMPAIGN_DISPATCH_BATCH,
			{
				campaignId,
				conferenceId,
				recipientIds: slice,
			},
			{
				attempts: 3,
				backoff: { type: "exponential", delay: 5000 },
				removeOnComplete: { age: 3600 * 24, count: 5000 },
				removeOnFail: { age: 3600 * 24 * 7 },
			},
		);
	}

	logger.info(
		{ campaignId, total, batches: Math.ceil(recipients.length / batch) },
		"campaign materialised",
	);
	return { total };
}

export async function processCampaignDispatchBatch(payload: {
	campaignId: string;
	conferenceId: string;
	recipientIds: string[];
}) {
	const { campaignId, conferenceId, recipientIds } = payload;

	const camp = await db
		.select()
		.from(messageCampaigns)
		.where(eq(messageCampaigns.id, campaignId))
		.limit(1)
		.then(r => r[0]);
	if (!camp) throw new Error(`campaign ${campaignId} not found`);
	if (camp.status === "cancelled") {
		logger.info({ campaignId }, "campaign cancelled — skipping batch");
		return;
	}

	const providerId = camp.providerId;
	if (!providerId) throw new Error("campaign has no providerId");

	const [provider] = await db
		.select()
		.from(messagingProviders)
		.where(eq(messagingProviders.id, providerId))
		.limit(1);
	if (!provider) throw new Error(`provider ${providerId} not found`);
	const creds = decryptJSON(provider.configEncrypted) as Record<string, any>;

	let subject = camp.subject ?? null;
	let bodyText = camp.bodyText;
	let bodyHtml = camp.bodyHtml ?? null;
	if (camp.templateId) {
		const [t] = await db
			.select()
			.from(messageTemplates)
			.where(eq(messageTemplates.id, camp.templateId))
			.limit(1);
		if (t) {
			subject = camp.subject ?? t.subject ?? null;
			bodyText = camp.bodyText || t.bodyText;
			bodyHtml = camp.bodyHtml ?? t.bodyHtml ?? null;
		}
	}

	const rps =
		camp.ratePerSecond ??
		(camp.channel === "email"
			? env.COMMS_EMAIL_RATE_PER_SEC
			: camp.channel === "sms"
				? env.COMMS_SMS_RATE_PER_SEC
				: env.COMMS_WA_RATE_PER_SEC);

	const recipients = await db
		.select()
		.from(messageRecipients)
		.where(inArray(messageRecipients.id, recipientIds));

	let sent = 0;
	let failed = 0;

	for (const r of recipients) {
		if (r.status !== "queued") continue;
		try {
			const merged = renderTemplate(bodyText, r);
			const mergedHtml = bodyHtml ? renderTemplate(bodyHtml, r) : null;
			const result = await sendMessage({
				channel: camp.channel,
				to: r.toAddress,
				subject,
				bodyText: merged,
				bodyHtml: mergedHtml,
				fromAddress: provider.fromAddress,
				fromName: provider.fromName,
				provider: provider.provider,
				credentials: creds,
				configPublic: provider.configPublic as any,
			});
			await db
				.update(messageRecipients)
				.set({
					status: "sent",
					providerMessageId: result.providerMessageId,
					sentAt: new Date(),
				})
				.where(eq(messageRecipients.id, r.id));
			sent++;
		} catch (err) {
			await db
				.update(messageRecipients)
				.set({
					status: "failed",
					errorMessage: (err as Error).message.slice(0, 1000),
					failedAt: new Date(),
				})
				.where(eq(messageRecipients.id, r.id));
			failed++;
			logger.warn({ err, recipientId: r.id }, "send failed");
		}

		await new Promise(resolve => setTimeout(resolve, 1000 / Math.max(rps, 1)));
	}

	await db
		.update(messageCampaigns)
		.set({
			sentCount: sql`${messageCampaigns.sentCount} + ${sent}`,
			failedCount: sql`${messageCampaigns.failedCount} + ${failed}`,
			updatedAt: new Date(),
		})
		.where(eq(messageCampaigns.id, campaignId));

	const [{ remaining }] = await db
		.select({
			remaining: sql<number>`count(*) FILTER (WHERE status = 'queued')::int`,
		})
		.from(messageRecipients)
		.where(eq(messageRecipients.campaignId, campaignId));
	if (remaining === 0) {
		await db
			.update(messageCampaigns)
			.set({
				status: "completed",
				completedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(messageCampaigns.id, campaignId));
		await withTenant(conferenceId, async tx => {
			await notifyConference(tx, conferenceId, {
				type: "campaign.completed",
				entity: "message_campaign",
				id: campaignId,
			});
		});
	}

	logger.info({ campaignId, sent, failed }, "dispatch batch complete");
	return { sent, failed };
}

function renderTemplate(template: string, recipient: any): string {
	return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) => {
		if (key === "name") return recipient.attendeeName ?? "";
		if (key === "email") return recipient.toAddress ?? "";
		if (key === "phone") return recipient.toAddress ?? "";
		return "";
	});
}
