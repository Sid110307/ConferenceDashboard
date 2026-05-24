import { decryptJSON, logger } from "@/lib/infra";
import { notifyConference } from "@/lib/notify";
import { commsQueue, defaultJobOptions, JOB_NAMES } from "@/lib/queue";
import { db, withTenant } from "@/lib/tenancy";
import { sendMessage } from "@/processors/comms/providers";
import { renderAll } from "@/processors/comms/render";
import {
	attendees,
	conferences,
	messageCampaigns,
	messageRecipients,
	messageTemplates,
	messagingProviders,
} from "@conference/db";
import { eq, sql } from "drizzle-orm";

const BATCH_SIZE = 25;

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export async function processCampaignDispatchBatch(payload: {
	campaignId: string;
	conferenceId: string;
}) {
	const { campaignId, conferenceId } = payload;

	const [campaign] = await db
		.select()
		.from(messageCampaigns)
		.where(eq(messageCampaigns.id, campaignId))
		.limit(1);
	if (!campaign) throw new Error(`campaign ${campaignId} not found`);
	if (campaign.status !== "sending") {
		logger.info({ campaignId, status: campaign.status }, "campaign not sending, halting");
		return;
	}

	const [template] = await db
		.select()
		.from(messageTemplates)
		.where(eq(messageTemplates.id, campaign.templateId!))
		.limit(1);
	if (!template) throw new Error(`template ${campaign.templateId} not found`);

	const [providerRow] = await db
		.select()
		.from(messagingProviders)
		.where(eq(messagingProviders.id, campaign.providerId!))
		.limit(1);
	if (!providerRow) throw new Error(`provider ${campaign.providerId} not found`);

	const [conf] = await db
		.select({
			name: conferences.name,
			shortName: conferences.shortName,
			slug: conferences.slug,
		})
		.from(conferences)
		.where(eq(conferences.id, conferenceId))
		.limit(1);

	const credentials = decryptJSON<Record<string, any>>(providerRow.configEncrypted);
	const configPublic = providerRow.configPublic as Record<string, any> | null;

	const ratePerSec = campaign.ratePerSecond ?? 10;
	const delayMs = Math.max(0, Math.floor(1000 / ratePerSec));

	let batchSent = 0;
	let batchFailed = 0;
	let exhausted = false;

	await withTenant(conferenceId, async tx => {
		const claimed = await tx.execute(sql<{
			id: string;
			attendee_id: string;
			address: string;
		}>`
			WITH next_batch AS (
				SELECT id FROM message_recipients
				WHERE campaign_id = ${campaignId} AND status = 'queued'
				ORDER BY created_at
				LIMIT ${BATCH_SIZE}
				FOR UPDATE SKIP LOCKED
			)
			UPDATE message_recipients m
			SET status = 'sending'
			FROM next_batch
			WHERE m.id = next_batch.id
			RETURNING m.id, m.attendee_id, m.address
		`);
		const claimedRows = (claimed as any).rows ?? (claimed as any) ?? [];
		if (!claimedRows.length) {
			exhausted = true;
			return;
		}

		const attendeeIds = claimedRows.map((r: any) => r.attendee_id);
		const attendeeRows = await tx
			.select()
			.from(attendees)
			.where(sql`${attendees.id} = ANY(${attendeeIds})`);
		const attendeeById = new Map(attendeeRows.map(a => [a.id, a]));

		for (const r of claimedRows) {
			const attendee = attendeeById.get(r.attendee_id);
			if (!attendee) {
				await tx
					.update(messageRecipients)
					.set({
						status: "failed",
						errorMessage: "attendee not found",
						failedAt: new Date(),
					})
					.where(eq(messageRecipients.id, r.id));
				batchFailed++;
				continue;
			}

			const ctx = {
				name: attendee.name,
				email: attendee.email,
				phone: attendee.phone,
				attendeeCode: attendee.attendeeCode,
				category: attendee.category,
				institution: attendee.institution,
				designation: attendee.designation,
				prantha: attendee.prantha,
				city: attendee.city,
				state: attendee.state,
				conference: {
					name: conf?.name ?? "",
					shortName: conf?.shortName ?? "",
					slug: conf?.slug ?? "",
				},
				...((attendee.customFields as Record<string, any>) ?? {}),
			};

			const rendered = renderAll(
				{
					subject: template.subject,
					body: template.body ?? "",
				},
				ctx,
			);

			try {
				const result = await sendMessage({
					channel: campaign.channel,
					to: r.address,
					subject: rendered.subject,
					body: rendered.body,
					fromAddress: providerRow.fromAddress,
					fromName: providerRow.fromName,
					provider: providerRow.provider,
					credentials,
					configPublic,
				});

				await tx
					.update(messageRecipients)
					.set({
						status: "sent",
						providerMessageId: result.providerMessageId,
						renderedSubject: rendered.subject,
						renderedBody: rendered.body,
						sentAt: new Date(),
					})
					.where(eq(messageRecipients.id, r.id));
				batchSent++;
			} catch (err: any) {
				await tx
					.update(messageRecipients)
					.set({
						status: "failed",
						errorMessage: String(err?.message ?? err).slice(0, 1000),
						renderedSubject: rendered.subject,
						renderedBody: rendered.body,
						failedAt: new Date(),
					})
					.where(eq(messageRecipients.id, r.id));
				batchFailed++;
				logger.warn(
					{ campaignId, recipientId: r.id, err: String(err) },
					"recipient send failed",
				);
			}

			if (delayMs > 0) await sleep(delayMs);
		}

		await tx
			.update(messageCampaigns)
			.set({
				sentCount: sql`${messageCampaigns.sentCount} + ${batchSent}`,
				failedCount: sql`${messageCampaigns.failedCount} + ${batchFailed}`,
				updatedAt: new Date(),
			})
			.where(eq(messageCampaigns.id, campaignId));

		await notifyConference(tx, conferenceId, {
			type: "campaign.progress",
			entity: "message_campaign",
			id: campaignId,
			meta: { batchSent, batchFailed },
		});
	});

	if (exhausted) {
		const [final] = await db
			.select({
				sent: messageCampaigns.sentCount,
				failed: messageCampaigns.failedCount,
				total: messageCampaigns.recipientCount,
			})
			.from(messageCampaigns)
			.where(eq(messageCampaigns.id, campaignId))
			.limit(1);

		const status = (final?.failed ?? 0) > 0 ? "completed_with_errors" : "completed";
		await db
			.update(messageCampaigns)
			.set({
				status,
				completedAt: new Date(),
				updatedAt: new Date(),
			})
			.where(eq(messageCampaigns.id, campaignId));

		await withTenant(conferenceId, async tx => {
			await notifyConference(tx, conferenceId, {
				type: "campaign.completed",
				entity: "message_campaign",
				id: campaignId,
				meta: {
					sent: final?.sent ?? 0,
					failed: final?.failed ?? 0,
					total: final?.total ?? 0,
					status,
				},
			});
		});
		logger.info(
			{ campaignId, sent: final?.sent, failed: final?.failed, status },
			"campaign completed",
		);
		return;
	}

	await commsQueue.add(
		JOB_NAMES.CAMPAIGN_DISPATCH_BATCH,
		{ campaignId, conferenceId },
		defaultJobOptions,
	);
}
