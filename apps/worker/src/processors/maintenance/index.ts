import { env } from "@/lib/env";
import { db } from "@/lib/tenancy";
import { files, invitations, verificationTokens } from "@conference/db";
import { createLogger, DeleteObjectCommand, s3 } from "@conference/infra";
import { and, eq, lt, sql } from "drizzle-orm";

const logger = createLogger({
	level: env.LOG_LEVEL,
	service: "@conference/worker",
	env: env.NODE_ENV,
});

export async function processCleanOldTokens() {
	const now = new Date();

	const v = await db.delete(verificationTokens).where(lt(verificationTokens.expiresAt, now));
	const verificationDeleted = (v as any).rowCount ?? 0;

	const i = await db.delete(invitations).where(lt(invitations.expiresAt, now));
	const invitationsDeleted = (i as any).rowCount ?? 0;

	logger.info(
		{ verificationDeleted, invitationsDeleted },
		"maintenance: old tokens and invitations cleaned up",
	);
	return { verificationDeleted, invitationsDeleted };
}

export async function processCleanOldFiles() {
	const now = new Date();
	const retentionPeriodDays = 7;
	const retentionDate = new Date(now.getTime() - retentionPeriodDays * 24 * 60 * 60 * 1000);

	const oldFiles = await db
		.select()
		.from(files)
		.where(
			and(
				lt(files.createdAt, retentionDate),
				sql<boolean>`file_is_unreferenced(${files.id}) = true`,
			),
		);
	for (const file of oldFiles) {
		try {
			const deletedFromStorage = await deleteFileFromStorage(
				file.storageBucket,
				file.storageKey,
			);
			if (deletedFromStorage) {
				await db.delete(files).where(eq(files.id, file.id));
				logger.info({ fileId: file.id }, `maintenance: deleted old file ${file.id}`);
			} else
				logger.warn({ fileId: file.id }, "maintenance: failed to delete file from storage");
		} catch (error) {
			logger.error({ fileId: file.id, error }, "maintenance: error deleting old file");
		}
	}

	return { deletedFiles: oldFiles.length };
}

async function deleteFileFromStorage(bucket: string, key: string): Promise<boolean> {
	try {
		await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
		return true;
	} catch (error) {
		logger.error({ bucket, key, error }, "maintenance: error deleting file from storage");
		return false;
	}
}
