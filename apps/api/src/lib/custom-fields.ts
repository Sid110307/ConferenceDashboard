import { UnprocessableError } from "@/lib/errors";
import { UnprocessableError } from "@/lib/errors";
import type { AppDb, TenantTx } from "@/lib/tenancy";
import { type CustomFieldDefinition, customFieldDefinitions } from "@conference/db";
import type { CustomFieldEntity } from "@conference/shared";
import { and, eq, isNull } from "drizzle-orm";

type CacheKey = string;
const CACHE = new Map<CacheKey, { at: number; defs: CustomFieldDefinition[] }>();
const CACHE_TTL_MS = 60000;

function key(conferenceId: string, entity: CustomFieldEntity): CacheKey {
	return `${conferenceId}:${entity}`;
}

export function invalidateCustomFieldsCache(conferenceId: string, entity?: CustomFieldEntity) {
	if (!entity) {
		for (const k of CACHE.keys()) {
			if (k.startsWith(`${conferenceId}:`)) CACHE.delete(k);
		}
		return;
	}
	CACHE.delete(key(conferenceId, entity));
}

async function loadDefinitions(
	tx: AppDb | TenantTx,
	conferenceId: string,
	entity: CustomFieldEntity,
): Promise<CustomFieldDefinition[]> {
	const cached = CACHE.get(key(conferenceId, entity));
	if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.defs;

	const defs = await tx
		.select()
		.from(customFieldDefinitions)
		.where(
			and(
				eq(customFieldDefinitions.conferenceId, conferenceId),
				eq(customFieldDefinitions.entity, entity),
				eq(customFieldDefinitions.isActive, true),
				isNull(customFieldDefinitions.deletedAt),
			),
		);

	CACHE.set(key(conferenceId, entity), { at: Date.now(), defs });
	return defs;
}

export async function validateCustomFields(opts: {
	tx: AppDb | TenantTx;
	conferenceId: string;
	entity: CustomFieldEntity;
	payload: Record<string, unknown> | null | undefined;
	partial?: boolean;
}): Promise<Record<string, unknown>> {
	const defs = await loadDefinitions(opts.tx, opts.conferenceId, opts.entity);
	const payload = (opts.payload ?? {}) as Record<string, unknown>;
	const errors: Record<string, string> = {};
	const result: Record<string, unknown> = {};

	for (const def of defs) {
		const has = Object.prototype.hasOwnProperty.call(payload, def.fieldKey);
		const raw = payload[def.fieldKey];

		if (!has || raw === null || raw === undefined || raw === "") {
			if (def.defaultValue && !has) {
				result[def.fieldKey] = coerce(def, def.defaultValue, errors);
				continue;
			}
			if (def.isRequired && !opts.partial) {
				errors[def.fieldKey] = "required";
			}
			continue;
		}

		const value = coerce(def, raw, errors);
		if (value !== undefined) result[def.fieldKey] = value;
	}

	if (Object.keys(errors).length > 0) {
		throw new UnprocessableError("custom fields validation failed", {
			fieldErrors: errors,
		});
	}

	return result;
}

function coerce(def: CustomFieldDefinition, raw: unknown, errors: Record<string, string>): unknown {
	const v = def.validation ?? {};
	switch (def.fieldType) {
		case "text":
		case "textarea": {
			if (typeof raw !== "string") {
				errors[def.fieldKey] = "must be a string";
				return undefined;
			}
			if (v.minLength != null && raw.length < v.minLength) {
				errors[def.fieldKey] = `min length ${v.minLength}`;
				return undefined;
			}
			if (v.maxLength != null && raw.length > v.maxLength) {
				errors[def.fieldKey] = `max length ${v.maxLength}`;
				return undefined;
			}
			if (v.regex) {
				try {
					if (!new RegExp(v.regex).test(raw)) {
						errors[def.fieldKey] = "regex mismatch";
						return undefined;
					}
				} catch {
					// ignore
				}
			}
			return raw;
		}
		case "email": {
			if (typeof raw !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(raw)) {
				errors[def.fieldKey] = "invalid email";
				return undefined;
			}
			return raw.toLowerCase();
		}
		case "phone": {
			if (typeof raw !== "string" || raw.length < 6 || raw.length > 32) {
				errors[def.fieldKey] = "invalid phone";
				return undefined;
			}
			return raw;
		}
		case "url": {
			if (typeof raw !== "string") {
				errors[def.fieldKey] = "must be a string";
				return undefined;
			}
			try {
				new URL(raw);
			} catch {
				errors[def.fieldKey] = "invalid url";
				return undefined;
			}
			return raw;
		}
		case "number": {
			const n = typeof raw === "number" ? raw : Number(raw);
			if (!Number.isFinite(n)) {
				errors[def.fieldKey] = "must be a number";
				return undefined;
			}
			if (v.min != null && n < v.min) {
				errors[def.fieldKey] = `min ${v.min}`;
				return undefined;
			}
			if (v.max != null && n > v.max) {
				errors[def.fieldKey] = `max ${v.max}`;
				return undefined;
			}
			return n;
		}
		case "checkbox": {
			if (typeof raw === "boolean") return raw;
			if (raw === "true" || raw === 1 || raw === "1") return true;
			if (raw === "false" || raw === 0 || raw === "0") return false;
			errors[def.fieldKey] = "must be a boolean";
			return undefined;
		}
		case "date": {
			if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
				errors[def.fieldKey] = "must be YYYY-MM-DD";
				return undefined;
			}
			return raw;
		}
		case "datetime": {
			if (typeof raw !== "string") {
				errors[def.fieldKey] = "must be ISO datetime";
				return undefined;
			}
			const d = new Date(raw);
			if (Number.isNaN(d.getTime())) {
				errors[def.fieldKey] = "must be ISO datetime";
				return undefined;
			}
			return d.toISOString();
		}
		case "select": {
			const allowed = new Set((def.options ?? []).map(o => o.value));
			if (typeof raw !== "string" || !allowed.has(raw)) {
				errors[def.fieldKey] = "not in options";
				return undefined;
			}
			return raw;
		}
		case "multiselect": {
			if (!Array.isArray(raw)) {
				errors[def.fieldKey] = "must be an array";
				return undefined;
			}
			const allowed = new Set((def.options ?? []).map(o => o.value));
			for (const item of raw) {
				if (typeof item !== "string" || !allowed.has(item)) {
					errors[def.fieldKey] = "contains invalid option";
					return undefined;
				}
			}
			return raw;
		}
		default:
			errors[def.fieldKey] = `unsupported type ${def.fieldType}`;
			return undefined;
	}
}
