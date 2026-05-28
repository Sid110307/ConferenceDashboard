import { env } from "@/lib/env";
import { db } from "@/lib/tenancy";
import { sendMessage } from "@/processors/comms/providers";
import { messagingProviders } from "@conference/db";
import { decryptJSON } from "@conference/infra";
import { eq } from "drizzle-orm";

export async function processSendMessage(payload: {
	conferenceId: string;
	inviteId: string;
	inviteUrl: string;
	email: string;
	providerId: string;
	subject: string;
	body: string;
	fromAddress?: string | null;
	fromName?: string | null;
}) {
	const { providerId } = payload;

	const [provider] = await db
		.select()
		.from(messagingProviders)
		.where(eq(messagingProviders.id, providerId))
		.limit(1);
	if (!provider) throw new Error(`provider ${providerId} not found`);

	const creds = decryptJSON(provider.configEncrypted, {
		encryptionKey: env.ENCRYPTION_KEY,
	}) as Record<string, any>;

	return await sendMessage({
		channel: "email",
		to: payload.email,
		subject: payload.subject,
		body: payload.body,
		fromAddress: payload.fromAddress ?? provider.fromAddress,
		fromName: payload.fromName ?? provider.fromName,
		provider: provider.provider,
		credentials: creds,
		configPublic: provider.configPublic as any,
	});
}
