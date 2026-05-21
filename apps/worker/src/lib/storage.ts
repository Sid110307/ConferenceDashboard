import { env } from "@/lib/env";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

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

export async function getObjectBuffer(key: string): Promise<Buffer> {
	const out = await s3.send(new GetObjectCommand({ Bucket: env.S3_BUCKET, Key: key }));
	if (!out.Body) throw new Error(`empty body for ${key}`);
	const chunks: Buffer[] = [];

	for await (const chunk of out.Body as AsyncIterable<Buffer | Uint8Array | string>) {
		chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
	}
	return Buffer.concat(chunks);
}

export async function putObject(opts: {
	key: string;
	body: Buffer | Uint8Array | string;
	contentType: string;
}) {
	await s3.send(
		new PutObjectCommand({
			Bucket: env.S3_BUCKET,
			Key: opts.key,
			Body: opts.body,
			ContentType: opts.contentType,
		}),
	);
}

export function storageKey(opts: {
	conferenceId?: string | null;
	purpose: string;
	fileId: string;
	filename: string;
}) {
	const safe = opts.filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
	const prefix = opts.conferenceId ? `c/${opts.conferenceId}` : "global";
	return `${prefix}/${opts.purpose}/${opts.fileId}-${safe}`;
}
