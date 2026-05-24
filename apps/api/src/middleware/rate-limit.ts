import type { AppContext } from "@/lib/context";
import { env } from "@/lib/env";
import { RateLimitedError } from "@/lib/errors";
import { createRedis } from "@conference/infra";
import { createMiddleware } from "hono/factory";

const redis = createRedis({ url: env.REDIS_URL, lazyConnect: false });

export type RateLimitOptions = {
	key: string;
	limit: number;
	windowSec: number;
	keyFn?: (c: Parameters<Parameters<typeof createMiddleware>[0]>[0]) => string;
};

export function rateLimit(opts: RateLimitOptions) {
	return createMiddleware<AppContext>(async (c, next) => {
		const ip =
			c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
			c.req.header("x-real-ip") ??
			"unknown";
		const key = opts.keyFn
			? opts.keyFn(c as Parameters<Parameters<typeof createMiddleware>[0]>[0])
			: `${opts.key}:${ip}`;
		const bucket = `rl:${key}`;

		const count = await redis.incr(bucket);
		if (count === 1) await redis.expire(bucket, opts.windowSec);

		if (count > opts.limit) {
			const ttl = await redis.ttl(bucket);
			c.header("retry-after", String(Math.max(ttl, 1)));
			throw new RateLimitedError(Math.max(ttl, 1));
		}

		c.header("x-ratelimit-limit", String(opts.limit));
		c.header("x-ratelimit-remaining", String(Math.max(opts.limit - count, 0)));
		await next();
	});
}
