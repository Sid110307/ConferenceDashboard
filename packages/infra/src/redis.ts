import IORedis from "ioredis";
import type pino from "pino";

export type RedisConfig = {
	url: string;
	lazyConnect?: boolean;
	logger?: pino.Logger;
};

export function createRedis(config: RedisConfig): IORedis {
	const redis = new IORedis(config.url, {
		maxRetriesPerRequest: null,
		enableReadyCheck: true,
		lazyConnect: config.lazyConnect ?? false,
	});

	if (config.logger) {
		redis.on("error", (err: any) => {
			config.logger!.error({ err }, "redis error");
		});
	}

	return redis;
}
