import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

export type CryptoConfig = {
	encryptionKey: string;
};

function getKey(config: CryptoConfig): Buffer {
	return Buffer.from(config.encryptionKey, "base64");
}

export function encrypt(plaintext: string, config: CryptoConfig, keyOverride?: Buffer): string {
	const key = keyOverride ?? getKey(config);
	const iv = randomBytes(IV_BYTES);
	const cipher = createCipheriv(ALGO, key, iv);
	const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, ct]).toString("base64");
}

export function decrypt(blob: string, config: CryptoConfig, keyOverride?: Buffer): string {
	const key = keyOverride ?? getKey(config);
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

export function encryptJSON(value: unknown, config: CryptoConfig): string {
	return encrypt(JSON.stringify(value), config);
}

export function decryptJSON<T = unknown>(blob: string, config: CryptoConfig): T {
	return JSON.parse(decrypt(blob, config)) as T;
}
