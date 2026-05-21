import { env } from "@/lib/env";
import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
	region: env.S3_REGION,
	endpoint: env.S3_ENDPOINT,
	forcePathStyle: env.S3_FORCE_PATH_STYLE,
	credentials:
		env.S3_ACCESS_KEY && env.S3_SECRET_KEY
			? {
					accessKeyId: env.S3_ACCESS_KEY,
					secretAccessKey: env.S3_SECRET_KEY,
				}
			: undefined,
});

export function storageKey(opts: {
	conferenceId?: string | null;
	purpose: string;
	fileId: string;
	filename: string;
}) {
	const safeFilename = opts.filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
	const prefix = opts.conferenceId ? `c/${opts.conferenceId}` : "global";
	return `${prefix}/${opts.purpose}/${opts.fileId}-${safeFilename}`;
}

export async function putObject(opts: {
	key: string;
	body: Buffer | Uint8Array | string;
	contentType: string;
	metadata?: Record<string, string>;
}) {
	await s3.send(
		new PutObjectCommand({
			Bucket: env.S3_BUCKET,
			Key: opts.key,
			Body: opts.body,
			ContentType: opts.contentType,
			Metadata: opts.metadata,
		}),
	);
}

export async function deleteObject(key: string) {
	await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

export async function objectExists(key: string): Promise<boolean> {
	try {
		await s3.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
		return true;
	} catch {
		return false;
	}
}

export async function presignDownloadUrl(key: string, expiresInSeconds = 60 * 15): Promise<string> {
	const cmd = new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key });
	return await getSignedUrl(s3, cmd, { expiresIn: expiresInSeconds });
}

export async function presignUploadUrl(opts: {
	key: string;
	contentType: string;
	expiresInSeconds?: number;
}): Promise<string> {
	const cmd = new PutObjectCommand({
		Bucket: env.S3_BUCKET,
		Key: opts.key,
		ContentType: opts.contentType,
	});
	return await getSignedUrl(s3, cmd, {
		expiresIn: opts.expiresInSeconds ?? 60 * 10,
	});
}

export function publicUrl(key: string): string | undefined {
	if (!env.S3_PUBLIC_BASE_URL) return undefined;
	return `${env.S3_PUBLIC_BASE_URL.replace(/\/$/, "")}/${key}`;
}
