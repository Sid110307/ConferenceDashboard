import { auth } from "@/auth";
import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { BadRequestError, NotFoundError } from "@/lib/errors";
import { hashToken } from "@/lib/id";
import { db } from "@/lib/tenancy";
import { requireAuth } from "@/middleware/auth";
import {
	accounts,
	conferences,
	invitations,
	userConferenceRoles,
	users as usersTable,
} from "@conference/db";
import { zValidator } from "@hono/zod-validator";
import { and, eq, gt, isNotNull, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const authRouter = new Hono<AppContext>();

authRouter.get("/me", async c => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session?.user) return c.json({ user: null });

	const [user] = await db
		.select({
			id: usersTable.id,
			email: usersTable.email,
			name: usersTable.name,
			image: usersTable.image,
			isPlatformAdmin: usersTable.isPlatformAdmin,
			lastSeenAt: usersTable.lastSeenAt,
			preferences: usersTable.preferences,
			createdAt: usersTable.createdAt,
			updatedAt: usersTable.updatedAt,
			isActive: usersTable.isActive,
			emailVerified: usersTable.emailVerified,
		})
		.from(usersTable)
		.where(eq(usersTable.id, session.user.id))
		.limit(1);
	if (!user) return c.json({ user: null });

	const memberships = await db
		.select({
			conferenceId: userConferenceRoles.conferenceId,
			role: userConferenceRoles.role,
			isActive: userConferenceRoles.isActive,
			conferenceSlug: conferences.slug,
			conferenceName: conferences.name,
			conferenceShortName: conferences.shortName,
			conferenceStatus: conferences.conferenceStatus,
			startDate: conferences.startDate,
			endDate: conferences.endDate,
		})
		.from(userConferenceRoles)
		.innerJoin(conferences, eq(userConferenceRoles.conferenceId, conferences.id))
		.where(
			and(
				eq(userConferenceRoles.userId, user.id),
				eq(userConferenceRoles.isActive, true),
				isNull(conferences.deletedAt),
			),
		);

	const [credentialAccount] = await db
		.select({ id: accounts.id })
		.from(accounts)
		.where(
			and(
				eq(accounts.userId, user.id),
				eq(accounts.providerId, "credential"),
				isNotNull(accounts.password),
			),
		)
		.limit(1);

	return c.json({ user: { ...user, hasPassword: !!credentialAccount }, memberships });
});

authRouter.post(
	"/password",
	requireAuth,
	zValidator("json", z.object({ newPassword: z.string().min(8).max(512) })),
	async c => {
		const { newPassword } = c.req.valid("json");
		await auth.api.setPassword({ body: { newPassword }, headers: c.req.raw.headers });

		return c.json({ ok: true });
	},
);

authRouter.post(
	"/invite/accept",
	requireAuth,
	zValidator("json", z.object({ token: z.string().min(8) })),
	async c => {
		const user = c.get("user")!;
		const { token } = c.req.valid("json");
		const tokenHash = await hashToken(token);

		const accepted = await db.transaction(async tx => {
			const [inv] = await tx
				.select()
				.from(invitations)
				.where(
					and(
						eq(invitations.tokenHash, tokenHash),
						gt(invitations.expiresAt, sql`now()`),
					),
				)
				.limit(1);

			if (!inv) throw new NotFoundError("invitation");
			if (inv.acceptedAt) throw new BadRequestError("already accepted");
			if (inv.revokedAt) throw new BadRequestError("invitation revoked");

			if (inv.email.toLowerCase() !== user.email.toLowerCase()) {
				throw new BadRequestError("invitation email mismatch");
			}

			await tx
				.insert(userConferenceRoles)
				.values({
					userId: user.id,
					conferenceId: inv.conferenceId,
					role: inv.role,
					isActive: true,
					invitedByUserId: inv.invitedByUserId,
					invitedAt: inv.createdAt,
					acceptedAt: new Date(),
				})
				.onConflictDoUpdate({
					target: [userConferenceRoles.userId, userConferenceRoles.conferenceId],
					set: {
						role: inv.role,
						isActive: true,
						acceptedAt: new Date(),
						revokedAt: null,
						updatedAt: new Date(),
					},
				});

			await tx
				.update(invitations)
				.set({ acceptedAt: new Date() })
				.where(eq(invitations.id, inv.id));

			await recordAudit(tx, {
				conferenceId: inv.conferenceId,
				userId: user.id,
				action: "accept_invite",
				entity: "user_conference_role",
				entityId: inv.id,
				meta: { role: inv.role },
				ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			return inv.conferenceId;
		});

		return c.json({ accepted: true, conferenceId: accepted });
	},
);
