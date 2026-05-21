import { auth } from "@/auth";
import type { AppContext } from "@/lib/context";
import { ForbiddenError, NotFoundError, UnauthorizedError } from "@/lib/errors";
import { db } from "@/lib/tenancy";
import { conferences, userConferenceRoles, users as usersTable } from "@conference/db";
import { ROLE_HIERARCHY, type UserRole } from "@conference/shared";
import { and, eq, isNull } from "drizzle-orm";
import { createMiddleware } from "hono/factory";

export const requireAuth = createMiddleware<AppContext>(async (c, next) => {
	const session = await auth.api.getSession({ headers: c.req.raw.headers });
	if (!session || !session.user) throw new UnauthorizedError();

	const [row] = await db
		.select({
			id: usersTable.id,
			email: usersTable.email,
			name: usersTable.name,
			image: usersTable.image,
			isPlatformAdmin: usersTable.isPlatformAdmin,
			isActive: usersTable.isActive,
		})
		.from(usersTable)
		.where(eq(usersTable.id, session.user.id))
		.limit(1);

	if (!row) throw new UnauthorizedError();
	if (!row.isActive) throw new UnauthorizedError("account deactivated");

	c.set("user", {
		id: row.id,
		email: row.email,
		name: row.name,
		image: row.image,
		isPlatformAdmin: row.isPlatformAdmin,
	});
	c.set("sessionId", session.session.id);
	await next();
});

export const resolveConference = createMiddleware<AppContext>(async (c, next) => {
	const user = c.get("user");
	if (!user) throw new UnauthorizedError();

	const slug = c.req.param("conferenceSlug");
	if (!slug) throw new NotFoundError("conference");

	const [conf] = await db
		.select({
			id: conferences.id,
			slug: conferences.slug,
			name: conferences.name,
			shortName: conferences.shortName,
		})
		.from(conferences)
		.where(and(eq(conferences.slug, slug), isNull(conferences.deletedAt)))
		.limit(1);

	if (!conf) throw new NotFoundError("conference");
	if (user.isPlatformAdmin) {
		c.set("conference", conf);
		c.set("membership", {
			role: "super_admin",
			isActive: true,
			permissions: {},
		});
		return next();
	}

	const [membership] = await db
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

	if (!membership || !membership.isActive) {
		throw new ForbiddenError("no access to this conference");
	}

	c.set("conference", conf);
	c.set("membership", {
		role: membership.role,
		isActive: membership.isActive,
		permissions: membership.permissions ?? {},
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
