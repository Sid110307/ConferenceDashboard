import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import IORedis from "ioredis";

export const redis = new IORedis(env.REDIS_URL, {
	maxRetriesPerRequest: null,
	enableReadyCheck: true,
	lazyConnect: false,
});

redis.on("error", err => {
	logger.error({ err }, "redis error");
});
