import type { AppContext } from "@/lib/context";
import { HttpError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { Context } from "hono";
import { ZodError } from "zod";

export function errorHandler(err: Error, c: Context<AppContext>) {
	const reqId = c.get("requestId");

	if (err instanceof HttpError) {
		return c.json(
			{
				error: err.code,
				message: err.message,
				details: err.details,
				requestId: reqId,
			},
			err.status as 400 | 401 | 403 | 404 | 409 | 422 | 429 | 500,
		);
	}

	if (err instanceof ZodError) {
		return c.json(
			{
				error: "bad_request",
				message: "validation failed",
				details: {
					issues: err.issues.map(i => ({
						path: i.path.join("."),
						message: i.message,
					})),
				},
				requestId: reqId,
			},
			400,
		);
	}

	logger.error({ err, reqId, path: new URL(c.req.url).pathname }, "unhandled error");
	return c.json(
		{
			error: "internal_error",
			message: "an unexpected error occurred",
			requestId: reqId,
		},
		500,
	);
}
