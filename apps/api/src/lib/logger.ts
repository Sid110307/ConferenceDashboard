import { env } from "@/lib/env";
import pino from "pino";

export const logger = pino({
	level: env.LOG_LEVEL,
	base: { service: "@conference/api", env: env.NODE_ENV },
	redact: {
		paths: [
			"req.headers.authorization",
			"req.headers.cookie",
			'req.headers["x-api-key"]',
			"*.password",
			"*.token",
			"*.tokenHash",
			"*.apiKey",
			"*.api_key",
			"*.secret",
			"*.configEncrypted",
			"*.config_encrypted",
			"req.body.password",
		],
		censor: "***",
	},
	transport:
		env.NODE_ENV === "development"
			? {
					target: "pino-pretty",
					options: {
						colorize: true,
						translateTime: "SYS:HH:MM:ss.l",
						ignore: "pid,hostname,service,env",
						singleLine: false,
					},
				}
			: undefined,
});

export type Logger = typeof logger;
