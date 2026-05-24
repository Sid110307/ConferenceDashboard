import { logger } from "@/lib/infra";

const VAR_RE = /\{\{\s*([a-zA-Z0-9_.]+)\s*}}/g;

export type RenderContext = Record<string, unknown>;

function getPath(ctx: RenderContext, path: string): unknown {
	const parts = path.split(".");
	let cur: any = ctx;
	for (const p of parts) {
		if (cur == null) return undefined;
		cur = cur[p];
	}
	return cur;
}

export function render(template: string, ctx: RenderContext): string {
	return template.replace(VAR_RE, (_, key) => {
		const v = getPath(ctx, String(key));
		if (v == null) {
			logger.debug({ key }, "template variable missing");
			return "";
		}
		return String(v);
	});
}

export function renderAll(parts: { subject?: string | null; body: string }, ctx: RenderContext) {
	return {
		subject: parts.subject ? render(parts.subject, ctx) : null,
		body: render(parts.body, ctx),
	};
}
