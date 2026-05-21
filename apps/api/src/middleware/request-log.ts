import type { AppContext } from "@/lib/context";
import { logger } from "@/lib/logger";
import { createMiddleware } from "hono/factory";

export const requestLogMiddleware = createMiddleware<AppContext>(async (c, next) => {
	const start = performance.now();
	const id = c.get("requestId");
	const method = c.req.method;
	const url = new URL(c.req.url);

	await next();

	const ms = Math.round(performance.now() - start);
	const status = c.res.status;
	const userId = c.get("user")?.id;
	const conferenceId = c.get("conference")?.id;

	const line = {
		reqId: id,
		method,
		path: url.pathname,
		status,
		ms,
		userId,
		conferenceId,
	};

	if (status >= 500) logger.error(line, "request");
	else if (status >= 400) logger.warn(line, "request");
	else logger.info(line, "request");
});
