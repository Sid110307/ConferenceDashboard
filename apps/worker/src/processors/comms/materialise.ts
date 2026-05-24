import { logger } from "@/lib/infra";
import { notifyConference } from "@/lib/notify";
import { commsQueue, defaultJobOptions, JOB_NAMES } from "@/lib/queue";
import { db, withTenant } from "@/lib/tenancy";
import {
	attendees,
	messageCampaigns,
	messageRecipients,
	messageTemplates,
	messagingProviders,
} from "@conference/db";
import { and, eq, inArray, isNull, sql } from "drizzle-orm";

type AudienceFilter = {
	all?: boolean;
	attendeeIds?: string[];
	category?: string[];
	gender?: string[];
	prantha?: string[];
	city?: string[];
	state?: string[];
	registrationStatus?: string[];
	checkinStatus?: string[];
	isVip?: boolean;
	tag?: string;
};

export async function processCampaignMaterialise(payload: {
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
	if (campaign.status !== "materialising") {
		logger.warn(
			{ campaignId, status: campaign.status },
			"campaign not in materialising state, skipping",
		);
		return;
	}

	const [template] = await db
		.select()
		.from(messageTemplates)
		.where(eq(messageTemplates.id, campaign.templateId!))
		.limit(1);
	if (!template) throw new Error(`template ${campaign.templateId} not found`);

	const [provider] = await db
		.select()
		.from(messagingProviders)
		.where(eq(messagingProviders.id, campaign.providerId!))
		.limit(1);
	if (!provider) throw new Error(`provider ${campaign.providerId} not found`);

	if (template.channel !== campaign.channel || provider.channel !== campaign.channel) {
		throw new Error("channel mismatch between campaign / template / provider");
	}

	const filter = (campaign.audienceFilter ?? {}) as AudienceFilter;
	let totalInserted = 0;

	try {
		await withTenant(conferenceId, async tx => {
			await tx.delete(messageRecipients).where(eq(messageRecipients.campaignId, campaignId));
			const conds: any[] = [
				eq(attendees.conferenceId, conferenceId),
				isNull(attendees.deletedAt),
			];

			if (filter.attendeeIds?.length) {
				conds.push(inArray(attendees.id, filter.attendeeIds));
			}
			if (filter.category?.length) {
				conds.push(inArray(attendees.category, filter.category as any));
			}
			if (filter.gender?.length) {
				conds.push(inArray(attendees.gender, filter.gender as any));
			}
			if (filter.prantha?.length) {
				conds.push(inArray(attendees.prantha, filter.prantha));
			}
			if (filter.city?.length) {
				conds.push(inArray(attendees.city, filter.city));
			}
			if (filter.state?.length) {
				conds.push(inArray(attendees.state, filter.state));
			}
			if (filter.registrationStatus?.length) {
				conds.push(inArray(attendees.registrationStatus, filter.registrationStatus as any));
			}
			if (filter.checkinStatus?.length) {
				conds.push(inArray(attendees.checkinStatus, filter.checkinStatus as any));
			}
			if (typeof filter.isVip === "boolean") {
				conds.push(eq(attendees.isVip, filter.isVip));
			}
			if (filter.tag) {
				conds.push(sql`${filter.tag} = ANY(${attendees.tags})`);
			}

			if (campaign.channel === "email") {
				conds.push(sql`${attendees.email} IS NOT NULL AND ${attendees.email} <> ''`);
			} else if (campaign.channel === "sms") {
				conds.push(sql`${attendees.phone} IS NOT NULL AND ${attendees.phone} <> ''`);
			} else if (campaign.channel === "whatsapp") {
				conds.push(sql`COALESCE(${attendees.whatsapp}, ${attendees.phone}) IS NOT NULL`);
			}

			const audience = await tx
				.select({
					id: attendees.id,
					name: attendees.name,
					email: attendees.email,
					phone: attendees.phone,
					whatsapp: attendees.whatsapp,
				})
				.from(attendees)
				.where(and(...conds));

			const BATCH = 500;
			for (let i = 0; i < audience.length; i += BATCH) {
				const slice = audience.slice(i, i + BATCH);
				const values = slice.map(a => {
					let address: string;
					if (campaign.channel === "email") address = a.email!;
					else if (campaign.channel === "sms") address = a.phone!;
					else address = a.whatsapp ?? a.phone!;
					return {
						conferenceId,
						campaignId,
						attendeeId: a.id,
						channel: campaign.channel,
						address,
						recipientName: a.name,
						status: "queued" as const,
						queuedAt: new Date(),
					};
				});
				if (values.length) {
					await tx.insert(messageRecipients).values(values);
					totalInserted += values.length;
				}
			}

			await tx
				.update(messageCampaigns)
				.set({
					status: "sending",
					recipientCount: totalInserted,
					startedAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(messageCampaigns.id, campaignId));

			await notifyConference(tx, conferenceId, {
				type: "campaign.materialised",
				entity: "message_campaign",
				id: campaignId,
				meta: { total: totalInserted },
			});
		});

		await commsQueue.add(
			JOB_NAMES.CAMPAIGN_DISPATCH_BATCH,
			{ campaignId, conferenceId },
			defaultJobOptions,
		);
	} catch (err: any) {
		logger.error({ campaignId, err: String(err) }, "campaign materialise failed");
		await db
			.update(messageCampaigns)
			.set({
				status: "failed",
				errorSummary: String(err?.message ?? err),
				updatedAt: new Date(),
			})
			.where(eq(messageCampaigns.id, campaignId));
		throw err;
	}

	logger.info({ campaignId, total: totalInserted }, "campaign materialised");
	return { total: totalInserted };
}
