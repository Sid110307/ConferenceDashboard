import { auth } from "@/auth";
import type { AppContext } from "@/lib/context";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { db } from "@/lib/tenancy";
import { conferences, userConferenceRoles, users as usersTable } from "@conference/db";
import { ROLE_HIERARCHY, type UserRole } from "@conference/shared";
import { and, eq, isNull } from "drizzle-orm";
import { Context } from "hono";
import { createMiddleware } from "hono/factory";

async function fetchAuthUser(c: Context) {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session?.user) throw new UnauthorizedError();

	const [row] = await db
		.select({
			id: usersTable.id,
			email: usersTable.email,
			name: usersTable.name,
			image: usersTable.image,
			isPlatformAdmin: usersTable.isPlatformAdmin,
			isActive: usersTable.isActive,
			lastSeenAt: usersTable.lastSeenAt,
			preferences: usersTable.preferences,
			createdAt: usersTable.createdAt,
			updatedAt: usersTable.updatedAt,
			emailVerified: usersTable.emailVerified,
		})
		.from(usersTable)
		.where(eq(usersTable.id, session.user.id))
		.limit(1);

	if (!row) throw new UnauthorizedError();
	if (!row.isActive) throw new UnauthorizedError("account deactivated");

	return {
		user: {
			id: row.id,
			email: row.email,
			name: row.name,
			image: row.image,
			isPlatformAdmin: row.isPlatformAdmin,
		},
		sessionId: session.session.id,
	};
}

export const loadAuthUser = createMiddleware(async (c, next) => {
	const u = await fetchAuthUser(c);
	if (u) {
		c.set("user", u);
		c.set("sessionId", u.sessionId);
	}
	await next();
});
export const requireAuth = createMiddleware(async (c, next) => {
	const u = await fetchAuthUser(c);
	if (!u) throw new UnauthorizedError();
	c.set("user", u.user);
	c.set("sessionId", u.sessionId);

	await next();
});

export const resolveConference = createMiddleware<AppContext>(async (c, next) => {
	const user = c.get("user");

	const slug = c.req.param("conferenceSlug");
	if (!slug) throw new NotFoundError("conference");

	const [conf] = await db
		.select({
			id: conferences.id,
			slug: conferences.slug,
			name: conferences.name,
			shortName: conferences.shortName,
			description: conferences.description,
			startDate: conferences.startDate,
			endDate: conferences.endDate,
			publicStatus: conferences.publicStatus,
			venueName: conferences.venueName,
			venueAddress: conferences.venueAddress,
		})
		.from(conferences)
		.where(and(eq(conferences.slug, slug), isNull(conferences.deletedAt)))
		.limit(1);
	if (!conf) throw new NotFoundError("conference");
	if (!user) throw new UnauthorizedError();

	const baseMembership: NonNullable<AppContext["Variables"]["membership"]> = {
		userId: user?.id ?? "",
		role: "viewer" as const,
		isActive: true,
		permissions: {},
	};

	if (user?.isPlatformAdmin) {
		c.set("conference", conf);
		c.set("membership", {
			userId: user.id,
			role: "super_admin",
			isActive: true,
			permissions: {},
		});
		return next();
	}

	let membership: NonNullable<AppContext["Variables"]["membership"]> = baseMembership;
	if (user) {
		const [row] = await db
			.select({
				role: userConferenceRoles.role,
				isActive: userConferenceRoles.isActive,
				permissions: userConferenceRoles.permissions,
			})
			.from(userConferenceRoles)
			.where(
				and(
					eq(userConferenceRoles.userId, user.id),
					eq(userConferenceRoles.conferenceId, conf.id),
				),
			)
			.limit(1);

		if (row?.isActive) {
			membership = {
				userId: user.id,
				role: row.role,
				isActive: row.isActive,
				permissions: row.permissions ?? {},
			};
		}
	}

	c.set("conference", conf);
	c.set("membership", {
		userId: membership.userId,
		role: membership.role,
		isActive: membership.isActive,
		permissions: membership.permissions,
	});
	await next();
});

export function requireRole(min: UserRole) {
	return createMiddleware<AppContext>(async (c, next) => {
		const m = c.get("membership");
		if (!m) throw new UnauthorizedError();
		if (ROLE_HIERARCHY[m.role] < ROLE_HIERARCHY[min]) {
			throw new ForbiddenError(`requires role ${min} or higher`, {
				yourRole: m.role,
				requiredRole: min,
			});
		}
		await next();
	});
}

export const requirePlatformAdmin = createMiddleware<AppContext>(async (c, next) => {
	const user = c.get("user");
	if (!user) throw new UnauthorizedError();
	if (!user.isPlatformAdmin) {
		throw new ForbiddenError("platform admin required");
	}
	await next();
});
