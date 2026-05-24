


import "dotenv/config";

import { env } from "@/lib/env";
import { db, messagingProviders } from "@conference/db";
import { createLogger, decrypt, encrypt } from "@conference/infra";
import { eq } from "drizzle-orm";





const logger = createLogger({
	level: env.LOG_LEVEL,
	service: "@conference/api",
	env: env.NODE_ENV,
	redactPaths: [
		"req.headers.authorization",
		"req.headers.cookie",
		'req.headers["x-api-key"]',
		"req.body.password",
	],
});

const oldKeyB64 = process.env.OLD_ENCRYPTION_KEY;
if (!oldKeyB64) {
	console.error("OLD_ENCRYPTION_KEY env var is required (base64, 32 bytes).");
	process.exit(1);
}
const oldKey = Buffer.from(oldKeyB64, "base64");
if (oldKey.length !== 32) {
	console.error("OLD_ENCRYPTION_KEY must decode to 32 bytes.");
	process.exit(1);
}

async function main() {
	logger.info("starting encryption-key rotation");
	let touched = 0;
	let failed = 0;

	await db.transaction(async tx => {
		const rows = await tx
			.select({
				id: messagingProviders.id,
				conferenceId: messagingProviders.conferenceId,
				configEncrypted: messagingProviders.configEncrypted,
			})
			.from(messagingProviders);

		logger.info({ count: rows.length }, "providers to rotate");

		for (const row of rows) {
			try {
				const plaintext = decrypt(row.configEncrypted, oldKey);
				const reEnc = encrypt(plaintext);
				await tx
					.update(messagingProviders)
					.set({ configEncrypted: reEnc, updatedAt: new Date() })
					.where(eq(messagingProviders.id, row.id));
				touched++;
			} catch (err) {
				failed++;
				logger.error(
					{ err, providerId: row.id, conferenceId: row.conferenceId },
					"rotation failed for provider",
				);
			}
		}

		if (failed > 0) {
			throw new Error(
				`rotation failed for ${failed} providers, transaction will be rolled back`,
			);
		}
	});

	logger.info({ touched, failed }, "rotation complete");
	process.exit(0);
}

main().catch(err => {
	logger.fatal({ err }, "rotation aborted");
	process.exit(1);
});
