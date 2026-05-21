import type { AppContext } from "@/lib/context";
import { requestId } from "@/lib/id";
import { createMiddleware } from "hono/factory";

export const requestIdMiddleware = createMiddleware<AppContext>(async (c, next) => {
	const incoming = c.req.header("x-request-id");
	const id = incoming && incoming.length <= 64 ? incoming : requestId();

	c.set("requestId", id);
	c.header("x-request-id", id);
	await next();
});
