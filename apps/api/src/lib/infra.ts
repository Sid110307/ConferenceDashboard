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
	service: "@conference/api",
	env: env.NODE_ENV,
	redactPaths: [
		"req.headers.authorization",
		"req.headers.cookie",
		'req.headers["x-api-key"]',
		"req.body.password",
	],
});

export const redis = createRedis({ url: env.REDIS_URL, lazyConnect: false, logger });

export const s3 = infraS3;
export const storageKey = infraStorageKey;
export const putObject = infraPutObject;
export const getObject = infraGetObject;
export const deleteObject = infraDeleteObject;
export const objectExists = infraHeadObject;
export const getSignedDownloadUrl = infraGetSignedDownloadUrl;
export const getSignedUploadUrl = infraGetSignedUploadUrl;

export async function presignDownloadUrl(key: string, expiresInSeconds = 60 * 15): Promise<string> {
	return infraGetSignedDownloadUrl(key, expiresInSeconds);
}

export async function presignUploadUrl(opts: {
	key: string;
	contentType: string;
	expiresInSeconds?: number;
}): Promise<string> {
	return infraGetSignedUploadUrl(opts.key, opts.contentType, opts.expiresInSeconds ?? 60 * 10);
}

export function publicUrl(key: string): string | undefined {
	if (!env.S3_PUBLIC_BASE_URL) return undefined;
	return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
}

const cryptoCfg = { encryptionKey: env.ENCRYPTION_KEY } as const;
export function encrypt(plaintext: string, keyOverride?: Buffer): string {
	return infraEncrypt(plaintext, cryptoCfg, keyOverride);
}

export function decrypt(blob: string, keyOverride?: Buffer): string {
	return infraDecrypt(blob, cryptoCfg, keyOverride);
}

export function encryptJSON(value: unknown): string {
	return infraEncryptJSON(value, cryptoCfg);
}

export function decryptJSON<T = unknown>(blob: string): T {
	return infraDecryptJSON<T>(blob, cryptoCfg);
}

export const getObjectBuffer = infraGetObject;
