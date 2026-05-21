import { randomBytes } from "node:crypto";

import { createId } from "@paralleldrive/cuid2";

export function makeToken(byteLength = 32): string {
	return randomBytes(byteLength).toString("base64url");
}

export async function hashToken(token: string): Promise<string> {
	const { createHash } = await import("node:crypto");
	return createHash("sha256").update(token).digest("hex");
}

export function requestId(): string {
	return createId();
}

export function pad(seq: number, width = 4): string {
	return String(seq).padStart(width, "0");
}

export const codes = {
	attendee: (prefix: string, seq: number) => `${prefix.toUpperCase()}-A${pad(seq, 4)}`,
	staff: (prefix: string, seq: number) => `${prefix.toUpperCase()}-S${pad(seq, 3)}`,
	issue: (seq: number) => `H-${pad(seq, 4)}`,
	vehicle: (seq: number) => `V-${pad(seq, 2)}`,
	certificate: (prefix: string, seq: number) => `${prefix.toUpperCase()}-CERT-${pad(seq, 4)}`,
};

export function prefixFromConference(opts: { shortName?: string | null; slug: string }): string {
	if (opts.shortName && opts.shortName.length <= 8) {
		return opts.shortName.toUpperCase().replace(/[^A-Z0-9]/g, "");
	}
	const slug = opts.slug.replace(/[^a-z0-9]/g, "").toUpperCase();
	return slug.slice(0, 8) || "CONF";
}
