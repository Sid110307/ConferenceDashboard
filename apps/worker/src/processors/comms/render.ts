import { logger } from "@/lib/infra";

const VAR_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*}}/g;

function getPath(ctx: Record<string, unknown>, path: string): unknown {
	const parts = path.split(".");
	let cur: any = ctx;

	for (const p of parts) {
		if (cur == null) return undefined;
		cur = cur[p];
	}

	return cur;
}

function formatValue(value: unknown): string {
	if (value == null) return "";
	if (value instanceof Date) return value.toLocaleDateString("en-IN");
	if (typeof value === "string") {
		if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
			const d = new Date(value);
			if (!Number.isNaN(d.getTime())) return d.toLocaleDateString("en-IN");
		}
		return value;
	}
	return typeof value === "number" || typeof value === "boolean" ? String(value) : String(value);
}

export function render(template: string, ctx: Record<string, unknown>): string {
	return template.replace(VAR_RE, (_, key) => {
		const value = getPath(ctx, String(key));
		if (value == null) {
			logger.debug({ key }, "template variable missing");
			return "";
		}

		return formatValue(value);
	});
}

export function renderAll(
	parts: { subject?: string | null; body: string },
	ctx: Record<string, unknown>,
) {
	return {
		subject: parts.subject ? render(parts.subject, ctx) : null,
		body: render(parts.body, ctx),
	};
}
