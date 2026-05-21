import type { AppDb, TenantTx } from "@/lib/tenancy";
import { auditLog, type NewAuditLogEntry } from "@conference/db";

const SENSITIVE_PATTERN = /password|hashed|secret|token|api_?key|config_?encrypted/i;

function sanitise(value: unknown): unknown {
	if (value == null || typeof value !== "object") return value;
	if (Array.isArray(value)) return value.map(sanitise);
	const out: Record<string, unknown> = {};
	for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
		if (SENSITIVE_PATTERN.test(k)) {
			out[k] = "***";
		} else {
			out[k] = sanitise(v);
		}
	}
	return out;
}

export type AuditAction =
	| "create"
	| "update"
	| "delete"
	| "restore"
	| "purge"
	| "login"
	| "logout"
	| "invite"
	| "accept_invite"
	| "export"
	| "import"
	| "send_campaign"
	| "role_change";

export type AuditInput = Omit<NewAuditLogEntry, "createdAt" | "id" | "changes"> & {
	before?: unknown;
	after?: unknown;
	meta?: unknown;
};

export async function recordAudit(tx: TenantTx | AppDb, input: AuditInput): Promise<void> {
	await tx.insert(auditLog).values({
		conferenceId: input.conferenceId,
		userId: input.userId,
		action: input.action,
		entity: input.entity,
		entityId: input.entityId,
		ip: input.ip,
		userAgent: input.userAgent,
		requestId: input.requestId,
		changes: {
			before: input.before === undefined ? undefined : sanitise(input.before),
			after: input.after === undefined ? undefined : sanitise(input.after),
			meta: input.meta === undefined ? undefined : sanitise(input.meta),
		},
	});
}
