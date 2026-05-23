import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { validateCustomFields } from "@/lib/custom-fields";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { withTenant, type TenantTx } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { LIMITS, paginationQuerySchema, type CustomFieldEntity } from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import {
	and,
	asc,
	desc,
	eq,
	getTableColumns,
	ilike,
	isNull,
	or,
	sql,
	type AnyColumn,
	type SQL,
} from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

import type { PgColumn, PgTable } from "drizzle-orm/pg-core";

export type CrudTable = PgTable & {
	id: PgColumn<any>;
	conferenceId: PgColumn<any>;
	createdAt: PgColumn<any>;
	updatedAt: PgColumn<any>;
	createdBy?: PgColumn<any>;
	updatedBy?: PgColumn<any>;
	deletedAt: PgColumn<any>;
	deletedBy?: PgColumn<any>;
};

export type CrudConfig = {
	table: CrudTable;
	entity: string;
	createSchema: z.ZodTypeAny;
	updateSchema: z.ZodTypeAny;
	listQuerySchema?: z.ZodTypeAny;
	searchColumns?: PgColumn<any>[];
	defaultSort?: PgColumn<any>;
	sortMap?: Record<string, PgColumn<any>>;
	applyFilters?: (filters: Record<string, unknown>, table: CrudTable) => SQL[];
	extras?: Record<string, SQL>;
	beforeIdRoutes?: (router: Hono<AppContext>) => void;
	customFieldEntity?: CustomFieldEntity;
	readRole?: "viewer" | "editor" | "admin" | "super_admin";
	writeRole?: "viewer" | "editor" | "admin" | "super_admin";
	deleteRole?: "viewer" | "editor" | "admin" | "super_admin";
};

const idParamSchema = z.object({ id: z.string().uuid() });

export function makeCrudRouter(cfg: CrudConfig) {
	const router = new Hono<AppContext>();
	const readRole = cfg.readRole ?? "viewer";
	const writeRole = cfg.writeRole ?? "editor";
	const deleteRole = cfg.deleteRole ?? "editor";
	const t = cfg.table;

	router.get(
		"/",
		requireRole(readRole),
		zValidator(
			"query",
			paginationQuerySchema
				.merge(
					cfg.listQuerySchema instanceof z.ZodObject ? cfg.listQuerySchema : z.object({}),
				)
				.extend({
					q: z.string().trim().optional(),
					includeDeleted: z.coerce.boolean().optional(),
				}),
		),
		async c => {
			const conf = c.get("conference")!;
			const query = c.req.valid("query") as Record<string, any>;

			const whereParts: SQL[] = [eq(t.conferenceId as AnyColumn, conf.id)];

			if (!query.includeDeleted) {
				whereParts.push(isNull(t.deletedAt));
			}

			if (query.q && cfg.searchColumns && cfg.searchColumns.length > 0) {
				const pattern = `%${query.q}%`;
				const orParts = cfg.searchColumns.map(col => ilike(col, pattern));
				whereParts.push(or(...orParts) as SQL);
			}

			if (cfg.applyFilters) {
				whereParts.push(...cfg.applyFilters(query, t));
			}

			let orderCol: PgColumn<any> = cfg.defaultSort ?? t.createdAt;
			if (typeof query.sort === "string" && cfg.sortMap?.[query.sort]) {
				orderCol = cfg.sortMap[query.sort]!;
			}
			const orderFn = query.order === "asc" ? asc : desc;

			const page = query.page ?? 1;
			const pageSize = Math.min(
				(query.pageSize as number) ?? LIMITS.PAGE_SIZE_DEFAULT,
				LIMITS.PAGE_SIZE_MAX,
			);
			const offset = (page - 1) * pageSize;

			const result = await withTenant(conf.id, async tx => {
				const data = await tx
					.select({ ...getTableColumns(t), ...(cfg.extras ?? {}) })
					.from(t)
					.where(and(...whereParts))
					.orderBy(orderFn(orderCol))
					.limit(pageSize)
					.offset(offset);

				const countRows = await tx
					.select({ count: sql<number>`count(*)::int` })
					.from(t)
					.where(and(...whereParts));
				const total = countRows[0]?.count ?? 0;
				return { data, total };
			});

			return c.json({
				data: result.data,
				pagination: {
					page,
					pageSize,
					total: result.total,
					totalPages: Math.max(1, Math.ceil(result.total / pageSize)),
					hasNextPage: page * pageSize < result.total,
				},
			});
		},
	);

	cfg.beforeIdRoutes?.(router);
	router.get("/:id", requireRole(readRole), zValidator("param", idParamSchema), async c => {
		const conf = c.get("conference")!;
		const { id } = c.req.valid("param");
		const row = await withTenant(conf.id, async tx =>
			findOneById(tx, t, conf.id, id, cfg.extras),
		);
		if (!row) throw new NotFoundError(cfg.entity);
		return c.json({ data: row });
	});

	router.post("/", requireRole(writeRole), zValidator("json", cfg.createSchema), async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const requestId = c.get("requestId");
		const input = c.req.valid("json") as Record<string, unknown>;

		const created = await withTenant(conf.id, async tx => {
			let customFields = input.customFields as Record<string, unknown> | undefined;
			if (cfg.customFieldEntity) {
				customFields = await validateCustomFields({
					tx,
					conferenceId: conf.id,
					entity: cfg.customFieldEntity,
					payload: customFields,
				});
			}

			const values = {
				...input,
				...(customFields !== undefined ? { customFields } : {}),
				conferenceId: conf.id,
				createdBy: user.id,
				updatedBy: user.id,
			};

			const inserted = await (tx as TenantTx)
				.insert(t)
				.values(values as unknown as Record<string, unknown>)
				.returning();
			const row = inserted[0]!;

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "create",
				entity: cfg.entity,
				entityId: row.id as string,
				after: row,
				ip: clientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId,
			});

			return row;
		});

		return c.json({ data: created }, 201);
	});

	router.patch(
		"/:id",
		requireRole(writeRole),
		zValidator("param", idParamSchema),
		zValidator("json", cfg.updateSchema),
		async c => {
			const conf = c.get("conference")!;
			const user = c.get("user")!;
			const requestId = c.get("requestId");
			const { id } = c.req.valid("param");
			const input = c.req.valid("json") as Record<string, unknown>;

			const updated = await withTenant(conf.id, async tx => {
				const before = await findOneById(tx, t, conf.id, id);
				if (!before) throw new NotFoundError(cfg.entity);

				let customFields: Record<string, unknown> | undefined;
				if (cfg.customFieldEntity && "customFields" in input) {
					customFields = await validateCustomFields({
						tx,
						conferenceId: conf.id,
						entity: cfg.customFieldEntity,
						payload: input.customFields as Record<string, unknown>,
						partial: true,
					});
				}

				const values = {
					...input,
					...(customFields !== undefined ? { customFields } : {}),
					updatedBy: user.id,
					updatedAt: new Date(),
				};

				const result = await (tx as TenantTx)
					.update(t)
					.set(values as unknown as Record<string, unknown>)
					.where(
						and(
							eq(t.id as AnyColumn, id),
							eq(t.conferenceId as AnyColumn, conf.id),
							isNull(t.deletedAt),
						),
					)
					.returning();
				const row = result[0];
				if (!row) throw new NotFoundError(cfg.entity);

				await recordAudit(tx, {
					conferenceId: conf.id,
					userId: user.id,
					action: "update",
					entity: cfg.entity,
					entityId: id,
					before,
					after: row,
					ip: clientIp(c),
					userAgent: c.req.header("user-agent") ?? null,
					requestId,
				});

				return row;
			});

			return c.json({ data: updated });
		},
	);

	router.delete(
		"/:id",
		requireRole(deleteRole),
		zValidator("param", idParamSchema),
		zValidator("query", z.object({ purge: z.coerce.boolean().optional() })),
		async c => {
			const conf = c.get("conference")!;
			const user = c.get("user")!;
			const m = c.get("membership")!;
			const requestId = c.get("requestId");
			const { id } = c.req.valid("param");
			const { purge } = c.req.valid("query");

			if (purge && m.role !== "super_admin") {
				throw new ForbiddenError("purge requires super_admin");
			}

			await withTenant(conf.id, async tx => {
				const before = await findOneById(tx, t, conf.id, id, {
					includeDeleted: true,
				});
				if (!before) throw new NotFoundError(cfg.entity);

				if (purge) {
					await (tx as TenantTx)
						.delete(t)
						.where(
							and(
								eq(t.id as AnyColumn, id),
								eq(t.conferenceId as AnyColumn, conf.id),
							),
						);
					await recordAudit(tx, {
						conferenceId: conf.id,
						userId: user.id,
						action: "purge",
						entity: cfg.entity,
						entityId: id,
						before,
						ip: clientIp(c),
						userAgent: c.req.header("user-agent") ?? null,
						requestId,
					});
				} else {
					await (tx as TenantTx)
						.update(t)
						.set({
							deletedAt: new Date(),
							deletedBy: user.id,
							updatedBy: user.id,
						} as unknown as Record<string, unknown>)
						.where(
							and(
								eq(t.id as AnyColumn, id),
								eq(t.conferenceId as AnyColumn, conf.id),
							),
						);
					await recordAudit(tx, {
						conferenceId: conf.id,
						userId: user.id,
						action: "delete",
						entity: cfg.entity,
						entityId: id,
						before,
						ip: clientIp(c),
						userAgent: c.req.header("user-agent") ?? null,
						requestId,
					});
				}
			});

			return c.json({ deleted: true, id, purged: !!purge });
		},
	);

	router.post(
		"/:id/restore",
		requireRole(deleteRole),
		zValidator("param", idParamSchema),
		async c => {
			const conf = c.get("conference")!;
			const user = c.get("user")!;
			const requestId = c.get("requestId");
			const { id } = c.req.valid("param");

			const restored = await withTenant(conf.id, async tx => {
				const before = await findOneById(tx, t, conf.id, id, {
					includeDeleted: true,
				});
				if (!before) throw new NotFoundError(cfg.entity);
				if (!(before as unknown as Record<string, unknown>).deletedAt) {
					throw new BadRequestError(`${cfg.entity} is not deleted`);
				}

				const result = await (tx as TenantTx)
					.update(t)
					.set({
						deletedAt: null,
						deletedBy: null,
						updatedBy: user.id,
						updatedAt: new Date(),
					} as unknown as Record<string, unknown>)
					.where(and(eq(t.id as AnyColumn, id), eq(t.conferenceId as AnyColumn, conf.id)))
					.returning();

				const row = result[0];
				if (!row) throw new NotFoundError(cfg.entity);

				await recordAudit(tx, {
					conferenceId: conf.id,
					userId: user.id,
					action: "restore",
					entity: cfg.entity,
					entityId: id,
					before,
					after: row,
					ip: clientIp(c),
					userAgent: c.req.header("user-agent") ?? null,
					requestId,
				});
				return row;
			});

			return c.json({ data: restored });
		},
	);

	return router;
}

async function findOneById(
	tx: TenantTx,
	t: CrudTable,
	conferenceId: string,
	id: string,
	opts: { includeDeleted?: boolean } = {},
	extras?: Record<string, SQL>,
) {
	const where = opts.includeDeleted
		? and(eq(t.id as AnyColumn, id), eq(t.conferenceId as AnyColumn, conferenceId))
		: and(
				eq(t.id as AnyColumn, id),
				eq(t.conferenceId as AnyColumn, conferenceId),
				isNull(t.deletedAt),
			);
	const rows = await tx
		.select({ ...getTableColumns(t), ...extras })
		.from(t)
		.where(where)
		.limit(1);
	return rows[0] ?? null;
}

function clientIp(c: AppContext): string | null {
	return (
		c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("x-real-ip") ?? null
	);
}
