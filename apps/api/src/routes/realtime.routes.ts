import type { AppContext } from "@/lib/context";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { requireRole } from "@/middleware/auth";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import pg from "pg";

export const realtimeRouter = new Hono<AppContext>();

realtimeRouter.get("/stream", requireRole("viewer"), async c => {
	const conf = c.get("conference")!;
	const channel = `conf:${conf.id}`;
	const reqId = c.get("requestId");

	return streamSSE(c, async stream => {
		const client = new pg.Client({
			connectionString: env.DATABASE_URL,
			ssl: env.DATABASE_SSL ? { rejectUnauthorized: false } : undefined,
		});
		await client.connect();

		const onNotify = async (msg: pg.Notification) => {
			if (msg.channel !== channel) return;
			try {
				await stream.writeSSE({
					event: "message",
					data: msg.payload ?? "",
					id: String(Date.now()),
				});
			} catch (err) {
				logger.warn({ err, reqId }, "sse write failed");
			}
		};

		client.on("notification", onNotify);
		await client.query(`LISTEN "${channel.replace(/"/g, '""')}"`);
		await stream.writeSSE({
			event: "ready",
			data: JSON.stringify({ channel, conferenceId: conf.id }),
		});

		const ping = setInterval(() => {
			stream.writeSSE({ event: "ping", data: String(Date.now()) }).catch(() => {});
		}, 25000);

		await new Promise<void>(resolve => {
			stream.onAbort(() => {
				clearInterval(ping);
				client
					.query(`UNLISTEN "${channel.replace(/"/g, '""')}"`)
					.catch(() => {})
					.finally(() => client.end().catch(() => {}));
				resolve();
			});
		});
	});
});
