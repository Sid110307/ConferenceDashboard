import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { BadRequestError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { hashToken, makeToken } from "@/lib/id";
import { db } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { invitations, userConferenceRoles, users as usersTable } from "@conference/db";
import { inviteUserSchema, USER_ROLES, type UserRole } from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, desc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const membersRouter = new Hono<AppContext>();

membersRouter.get("/", requireRole("admin"), async c => {
	const conf = c.get("conference")!;
	const rows = await db
		.select({
			userId: usersTable.id,
			email: usersTable.email,
			name: usersTable.name,
			image: usersTable.image,
			role: userConferenceRoles.role,
			isActive: userConferenceRoles.isActive,
			acceptedAt: userConferenceRoles.acceptedAt,
			invitedAt: userConferenceRoles.invitedAt,
		})
		.from(userConferenceRoles)
		.innerJoin(usersTable, eq(userConferenceRoles.userId, usersTable.id))
		.where(eq(userConferenceRoles.conferenceId, conf.id))
		.orderBy(desc(userConferenceRoles.createdAt));

	return c.json({ data: rows });
});

membersRouter.patch(
	"/:userId",
	requireRole("admin"),
	zValidator("param", z.object({ userId: z.string().uuid() })),
	zValidator(
		"json",
		z.object({
			role: z.enum(USER_ROLES as readonly [UserRole, ...UserRole[]]).optional(),
			isActive: z.boolean().optional(),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const m = c.get("membership")!;
		const me = c.get("user")!;
		const { userId } = c.req.valid("param");
		const input = c.req.valid("json");

		if (userId === me.id) {
			throw new BadRequestError("Cannot change your own role here");
		}

		if (input.role === "super_admin" && m.role !== "super_admin") {
			throw new ForbiddenError("Only super_admin can grant super_admin");
		}

		const updated = await db.transaction(async tx => {
			const [before] = await tx
				.select()
				.from(userConferenceRoles)
				.where(
					and(
						eq(userConferenceRoles.userId, userId),
						eq(userConferenceRoles.conferenceId, conf.id),
					),
				)
				.limit(1);
			if (!before) throw new NotFoundError("member");

			if (before.role === "super_admin" && m.role !== "super_admin") {
				throw new ForbiddenError("Only super_admin can modify super_admin");
			}

			const [row] = await tx
				.update(userConferenceRoles)
				.set({
					...(input.role ? { role: input.role } : {}),
					...(typeof input.isActive === "boolean"
						? {
								isActive: input.isActive,
								revokedAt: input.isActive ? null : new Date(),
							}
						: {}),
					updatedAt: new Date(),
				})
				.where(eq(userConferenceRoles.id, before.id))
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: me.id,
				action: "role_change",
				entity: "user_conference_role",
				entityId: before.id,
				before,
				after: row,
				ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			return row;
		});

		return c.json({ data: updated });
	},
);

membersRouter.delete(
	"/:userId",
	requireRole("admin"),
	zValidator("param", z.object({ userId: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const me = c.get("user")!;
		const m = c.get("membership")!;
		const { userId } = c.req.valid("param");

		if (userId === me.id) {
			throw new BadRequestError("Cannot remove yourself");
		}

		await db.transaction(async tx => {
			const [before] = await tx
				.select()
				.from(userConferenceRoles)
				.where(
					and(
						eq(userConferenceRoles.userId, userId),
						eq(userConferenceRoles.conferenceId, conf.id),
					),
				)
				.limit(1);
			if (!before) throw new NotFoundError("member");

			if (before.role === "super_admin" && m.role !== "super_admin") {
				throw new ForbiddenError("Only super_admin can remove super_admin");
			}

			await tx
				.update(userConferenceRoles)
				.set({ isActive: false, revokedAt: new Date(), updatedAt: new Date() })
				.where(eq(userConferenceRoles.id, before.id));

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: me.id,
				action: "role_change",
				entity: "user_conference_role",
				entityId: before.id,
				before,
				after: { ...before, isActive: false },
				meta: { removed: true },
				ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
		});

		return c.json({ removed: true });
	},
);

membersRouter.get("/invites", requireRole("admin"), async c => {
	const conf = c.get("conference")!;
	const rows = await db
		.select()
		.from(invitations)
		.where(eq(invitations.conferenceId, conf.id))
		.orderBy(desc(invitations.createdAt));
	return c.json({ data: rows });
});

membersRouter.post(
	"/invite",
	requireRole("admin"),
	zValidator("json", inviteUserSchema),
	async c => {
		const conf = c.get("conference")!;
		const me = c.get("user")!;
		const m = c.get("membership")!;
		const input = c.req.valid("json");

		if (input.role === "super_admin" && m.role !== "super_admin") {
			throw new ForbiddenError("Only super_admin can invite super_admin");
		}

		const token = makeToken(32);
		const tokenHash = await hashToken(token);

		const created = await db.transaction(async tx => {
			const [existing] = await tx
				.select({ id: invitations.id })
				.from(invitations)
				.where(
					and(
						eq(invitations.conferenceId, conf.id),
						eq(invitations.email, input.email),
						isNull(invitations.acceptedAt),
						isNull(invitations.revokedAt),
					),
				)
				.limit(1);
			if (existing) {
				throw new BadRequestError("Invitation already pending for this email");
			}

			const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
			const [inv] = await tx
				.insert(invitations)
				.values({
					conferenceId: conf.id,
					email: input.email,
					role: input.role,
					tokenHash,
					invitedByUserId: me.id,
					expiresAt,
				})
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: me.id,
				action: "invite",
				entity: "invitation",
				entityId: inv!.id,
				meta: { email: input.email, role: input.role },
				ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			return inv;
		});

		return c.json(
			{
				data: created,
				inviteUrl: `${c.req.url.split("/api/")[0]}/invite/${token}`,
				token,
			},
			201,
		);
	},
);

membersRouter.post(
	"/invite/:id/revoke",
	requireRole("admin"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const me = c.get("user")!;
		const { id } = c.req.valid("param");

		await db.transaction(async tx => {
			const [inv] = await tx
				.select()
				.from(invitations)
				.where(and(eq(invitations.id, id), eq(invitations.conferenceId, conf.id)))
				.limit(1);
			if (!inv) throw new NotFoundError("invitation");
			if (inv.acceptedAt) throw new BadRequestError("Already accepted");

			await tx
				.update(invitations)
				.set({ revokedAt: new Date() })
				.where(eq(invitations.id, id));

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: me.id,
				action: "role_change",
				entity: "invitation",
				entityId: id,
				meta: { revoked: true },
				ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
		});

		return c.json({ revoked: true });
	},
);
