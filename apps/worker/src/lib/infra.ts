import { env } from "@/lib/env";
import {
	createLogger,
	createRedis,
	decrypt as infraDecrypt,
	decryptJSON as infraDecryptJSON,
	deleteObject as infraDeleteObject,
	encrypt as infraEncrypt,
	encryptJSON as infraEncryptJSON,
	getObject as infraGetObject,
	getSignedDownloadUrl as infraGetSignedDownloadUrl,
	getSignedUploadUrl as infraGetSignedUploadUrl,
	headObject as infraHeadObject,
	putObject as infraPutObject,
	s3 as infraS3,
	storageKey as infraStorageKey,
} from "@conference/infra";

export const logger = createLogger({
	level: env.LOG_LEVEL,
	service: "@conference/worker",
	env: env.NODE_ENV,
});

export const redis = createRedis({ url: env.REDIS_URL, logger });

export const s3 = infraS3;
export const storageKey = infraStorageKey;
export const putObject = infraPutObject;
export const getObject = infraGetObject;
export const deleteObject = infraDeleteObject;
export const headObject = infraHeadObject;

export async function getSignedDownloadUrl(
	key: string,
	expiresInSeconds = 60 * 15,
): Promise<string> {
	return infraGetSignedDownloadUrl(key, expiresInSeconds);
}

export async function getSignedUploadUrl(
	key: string,
	contentType: string,
	expiresInSeconds = 60 * 10,
): Promise<string> {
	return infraGetSignedUploadUrl(key, contentType, expiresInSeconds);
}

export function publicUrl(key: string): string | undefined {
	if (!env.S3_PUBLIC_BASE_URL) return undefined;
	return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
}

const cryptoCfg = { encryptionKey: env.ENCRYPTION_KEY } as const;
export function encrypt(plaintext: string): string {
	return infraEncrypt(plaintext, cryptoCfg);
}
export function decrypt(blob: string): string {
	return infraDecrypt(blob, cryptoCfg);
}
export function encryptJSON(value: unknown): string {
	return infraEncryptJSON(value, cryptoCfg);
}
export function decryptJSON<T = unknown>(blob: string): T {
	return infraDecryptJSON<T>(blob, cryptoCfg);
}

export const getObjectBuffer = infraGetObject;

export const JOB_NAMES = {
	IMPORT_PREVIEW: "import.preview",
	IMPORT_START: "import.start",
	IMPORT_ROLLBACK: "import.rollback",
	CAMPAIGN_MATERIALISE: "campaign.materialise",
	CAMPAIGN_DISPATCH_BATCH: "campaign.dispatch_batch",
	REPORT_GENERATE: "report.generate",
	MAINT_CLEAN_OLD_TOKENS: "maint.clean_old_tokens",
	MAINT_REFRESH_DASHBOARD: "maint.refresh_dashboard",
} as const;
