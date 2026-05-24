import { env } from "@/lib/env";
import { createLogger } from "@conference/infra";

export const logger = createLogger({
	level: env.LOG_LEVEL,
	service: "@conference/api",
	env: env.NODE_ENV,
	redactPaths: [
		"req.headers.authorization",
		"req.headers.cookie",
		'req.headers["x-api-key"]',
		"req.body.password",
	],
});
