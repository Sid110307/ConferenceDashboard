import { env } from "@/lib/env";
import pino from "pino";

export const logger = pino({
	level: env.LOG_LEVEL,
	base: { service: "@conference/worker", env: env.NODE_ENV },
	redact: {
		paths: [
			"*.password",
			"*.hashedPassword",
			"*.token",
			"*.tokenHash",
			"*.apiKey",
			"*.api_key",
			"*.secret",
			"*.configEncrypted",
			"*.config_encrypted",
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
					},
				}
			: undefined,
});
