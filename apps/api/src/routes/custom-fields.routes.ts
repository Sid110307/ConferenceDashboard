import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { invalidateCustomFieldsCache } from "@/lib/custom-fields";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { getClientIp } from "@/lib/http";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { customFieldDefinitions } from "@conference/db";
import {
	CUSTOM_FIELD_ENTITIES,
	customFieldDefinitionSchema,
	customFieldDefinitionUpdateSchema,
	type CustomFieldEntity,
} from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const customFieldsRouter = new Hono<AppContext>();

customFieldsRouter.get(
	"/",
	requireRole("viewer"),
	zValidator(
		"query",
		z.object({
			entity: z
				.enum(CUSTOM_FIELD_ENTITIES as readonly [CustomFieldEntity, ...CustomFieldEntity[]])
				.optional(),
			includeInactive: z.coerce.boolean().optional(),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const q = c.req.valid("query");
		const rows = await withTenant(conf.id, async tx => {
			const parts: any[] = [
				eq(customFieldDefinitions.conferenceId, conf.id),
				isNull(customFieldDefinitions.deletedAt),
			];
			if (q.entity) parts.push(eq(customFieldDefinitions.entity, q.entity));
			if (!q.includeInactive) parts.push(eq(customFieldDefinitions.isActive, true));
			return tx
				.select()
				.from(customFieldDefinitions)
				.where(and(...parts))
				.orderBy(asc(customFieldDefinitions.entity), asc(customFieldDefinitions.sortOrder));
		});
		return c.json({ data: rows });
	},
);

customFieldsRouter.post(
	"/",
	requireRole("admin"),
	zValidator("json", customFieldDefinitionSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const input = c.req.valid("json");

		const row = await withTenant(conf.id, async tx => {
			const [existing] = await tx
				.select({ id: customFieldDefinitions.id })
				.from(customFieldDefinitions)
				.where(
					and(
						eq(customFieldDefinitions.conferenceId, conf.id),
						eq(customFieldDefinitions.entity, input.entity),
						eq(customFieldDefinitions.fieldKey, input.fieldKey),
						isNull(customFieldDefinitions.deletedAt),
					),
				)
				.limit(1);
			if (existing) {
				throw new ConflictError(
					`Field "${input.fieldKey}" already exists for ${input.entity}`,
				);
			}

			const [r] = await tx
				.insert(customFieldDefinitions)
				.values({
					...input,
					conferenceId: conf.id,
					createdBy: user.id,
					updatedBy: user.id,
				})
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "create",
				entity: "custom_field_definition",
				entityId: r!.id,
				after: r,
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
			return r;
		});

		invalidateCustomFieldsCache(conf.id, input.entity);
		return c.json({ data: row }, 201);
	},
);

customFieldsRouter.patch(
	"/:id",
	requireRole("admin"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator("json", customFieldDefinitionUpdateSchema),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		const input = c.req.valid("json");

		const row = await withTenant(conf.id, async tx => {
			const [before] = await tx
				.select()
				.from(customFieldDefinitions)
				.where(
					and(
						eq(customFieldDefinitions.id, id),
						eq(customFieldDefinitions.conferenceId, conf.id),
					),
				)
				.limit(1);
			if (!before) throw new NotFoundError("field");

			const [r] = await tx
				.update(customFieldDefinitions)
				.set({ ...input, updatedBy: user.id, updatedAt: new Date() })
				.where(eq(customFieldDefinitions.id, id))
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "update",
				entity: "custom_field_definition",
				entityId: id,
				before,
				after: r,
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
			return { row: r, entity: before.entity };
		});

		invalidateCustomFieldsCache(conf.id, row.entity as CustomFieldEntity);
		return c.json({ data: row.row });
	},
);

customFieldsRouter.delete(
	"/:id",
	requireRole("admin"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		const result = await withTenant(conf.id, async tx => {
			const [before] = await tx
				.select()
				.from(customFieldDefinitions)
				.where(
					and(
						eq(customFieldDefinitions.id, id),
						eq(customFieldDefinitions.conferenceId, conf.id),
					),
				)
				.limit(1);
			if (!before) throw new NotFoundError("field");
			await tx
				.update(customFieldDefinitions)
				.set({ deletedAt: new Date(), deletedBy: user.id })
				.where(eq(customFieldDefinitions.id, id));
			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "delete",
				entity: "custom_field_definition",
				entityId: id,
				before,
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
			return before.entity;
		});
		invalidateCustomFieldsCache(conf.id, result as CustomFieldEntity);
		return c.json({ deleted: true });
	},
);
