import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "@/lib/env";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer {
	return Buffer.from(env.ENCRYPTION_KEY, "base64");
}

export function encrypt(plaintext: string, keyOverride?: Buffer): string {
	const key = keyOverride ?? getKey();
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv(ALGO, key, iv);
	const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decrypt(blob: string, keyOverride?: Buffer): string {
	const key = keyOverride ?? getKey();
	const buf = Buffer.from(blob, "base64");
	if (buf.length < IV_BYTES + TAG_BYTES) {
		throw new Error("ciphertext too short");
	}
	const iv = buf.subarray(0, IV_BYTES);
	const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
	const ct = buf.subarray(IV_BYTES + TAG_BYTES);
	const decipher = createDecipheriv(ALGO, key, iv);
	decipher.setAuthTag(tag);
	const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
	return pt.toString("utf8");
}

export function encryptJSON(value: unknown): string {
	return encrypt(JSON.stringify(value));
}

export function decryptJSON<T = unknown>(blob: string): T {
	return JSON.parse(decrypt(blob)) as T;
}
