import pino from "pino";

export type LoggerConfig = {
	level: string;
	service: string;
	env: string;
	redactPaths?: string[];
};

export function createLogger(config: LoggerConfig): pino.Logger {
	return pino({
		level: config.level,
		base: { service: config.service, env: config.env },
		redact: {
			paths: [
				...(config.redactPaths ?? []),
				"*.password",
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
			config.env === "development"
				? {
						target: "pino-pretty",
						options: {
							colorize: true,
							singleLine: false,
							translateTime: "SYS:standard",
							ignore: "pid,hostname",
						},
					}
				: undefined,
	});
}
