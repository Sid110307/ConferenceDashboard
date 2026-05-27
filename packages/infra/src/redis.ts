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
		enableOfflineQueue: false,
		connectTimeout: 5000,
		lazyConnect: config.lazyConnect ?? true,
		retryStrategy: times => Math.min(times * 250, 2000),
	});

	if (config.logger) {
		redis.on("error", (err: any) => {
			config.logger!.error({ err }, "redis error");
		});
		redis.on("reconnecting", (delay: number) => {
			config.logger!.warn({ delay }, "redis reconnecting");
		});
	}

	return redis;
}
