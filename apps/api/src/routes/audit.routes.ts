import type { AppContext } from "@/lib/context";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { auditLog, users as usersTable } from "@conference/db";
import { paginationQuerySchema } from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const auditRouter = new Hono<AppContext>();

auditRouter.get(
	"/",
	requireRole("admin"),
	zValidator(
		"query",
		paginationQuerySchema.extend({
			action: z
				.enum([
					"create",
					"update",
					"delete",
					"restore",
					"purge",
					"login",
					"logout",
					"invite",
					"accept_invite",
					"export",
					"import",
					"send_campaign",
					"role_change",
				] as const)
				.optional(),
			entity: z.string().optional(),
			userId: z.string().uuid().optional(),
			from: z.string().datetime({ offset: true }).optional(),
			to: z.string().datetime({ offset: true }).optional(),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const q = c.req.valid("query");

		const parts: any[] = [eq(auditLog.conferenceId, conf.id)];
		if (q.action) parts.push(eq(auditLog.action, q.action));
		if (q.entity) parts.push(eq(auditLog.entity, q.entity));
		if (q.userId) parts.push(eq(auditLog.userId, q.userId));
		if (q.from) parts.push(gte(auditLog.createdAt, new Date(q.from)));
		if (q.to) parts.push(lte(auditLog.createdAt, new Date(q.to)));

		const offset = (q.page - 1) * q.pageSize;
		const result = await withTenant(conf.id, async tx => {
			const data = await tx
				.select({
					id: auditLog.id,
					action: auditLog.action,
					entity: auditLog.entity,
					entityId: auditLog.entityId,
					changes: auditLog.changes,
					ip: auditLog.ip,
					userAgent: auditLog.userAgent,
					requestId: auditLog.requestId,
					createdAt: auditLog.createdAt,
					userId: auditLog.userId,
					userEmail: usersTable.email,
					userName: usersTable.name,
				})
				.from(auditLog)
				.leftJoin(usersTable, eq(usersTable.id, auditLog.userId))
				.where(and(...parts))
				.orderBy(desc(auditLog.createdAt))
				.limit(q.pageSize)
				.offset(offset);
			const [{ n }] = await tx
				.select({ n: sql<number>`count(*)::int` })
				.from(auditLog)
				.where(and(...parts));
			return { data, total: n };
		});

		return c.json({
			data: result.data,
			pagination: {
				page: q.page,
				pageSize: q.pageSize,
				total: result.total,
				totalPages: Math.max(1, Math.ceil(result.total / q.pageSize)),
				hasNextPage: q.page * q.pageSize < result.total,
			},
		});
	},
);
