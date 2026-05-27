import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { register } from "tsconfig-paths";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

register({ baseUrl: __dirname, paths: { "@/*": ["*"] } });

(async () => {
	const { app } = await import("@/app");
	const { env } = await import("@/lib/env");
	const { createLogger } = await import("@conference/infra");
	const { serve } = await import("@hono/node-server");

	const logger = createLogger({
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

	serve(
		{
			fetch: app.fetch,
			hostname: env.HOST,
			port: env.PORT,
		},
		info => {
			logger.info(
				{
					bind: `${info.address}:${info.port}`,
					env: env.NODE_ENV,
					api: env.API_BASE_URL,
					web: env.WEB_BASE_URL,
				},
				"@conference/api listening",
			);
		},
	);

	const shutdown = (sig: string) => {
		logger.info({ sig }, "shutdown signal received");
		process.exit(0);
	};
	process.on("SIGINT", () => shutdown("SIGINT"));
	process.on("SIGTERM", () => shutdown("SIGTERM"));
	process.on("uncaughtException", err => {
		logger.fatal({ err }, "uncaught exception");
		process.exit(1);
	});
	process.on("unhandledRejection", reason => {
		logger.fatal({ reason }, "unhandled rejection");
		process.exit(1);
	});
})().catch(err => {
	console.error("Failed to start server:", err);
	process.exit(1);
});
