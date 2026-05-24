import {
	DeleteObjectCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "./env";

export const s3 = new S3Client({
	region: env.S3_REGION,
	endpoint: env.S3_ENDPOINT,
	forcePathStyle: true,
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

export async function getObject(key: string): Promise<Buffer> {
	const out = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
	if (!out.Body) throw new Error(`empty body for ${key}`);
	const chunks: Buffer[] = [];

	for await (const chunk of out.Body as AsyncIterable<Buffer | Uint8Array | string>) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
}

export async function deleteObject(key: string): Promise<void> {
	await s3.send(new DeleteObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
}

export async function headObject(key: string): Promise<boolean> {
	try {
		await s3.send(new HeadObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
		return true;
	} catch {
		return false;
	}
}

export async function getSignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
	return getSignedUrl(s3, new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }), {
		expiresIn,
	});
}

export async function getSignedUploadUrl(
	key: string,
	contentType: string,
	expiresIn: number = 3600,
): Promise<string> {
	return getSignedUrl(
		s3,
		new PutObjectCommand({ Bucket: env.S3_BUCKET, Key: key, ContentType: contentType }),
		{
			expiresIn,
		},
	);
}
