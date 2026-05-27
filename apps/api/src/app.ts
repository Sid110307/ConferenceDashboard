import { auth } from "@/auth";
import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { env } from "@/lib/env";
import { NotFoundError } from "@/lib/errors";
import { withTenant } from "@/lib/tenancy";
import { loadAuthUser, requireRole, resolveConference } from "@/middleware/auth";
import { errorHandler } from "@/middleware/error-handler";
import { requestIdMiddleware } from "@/middleware/request-id";
import { requestLogMiddleware } from "@/middleware/request-log";
import { accommodationIssuesRouter, allocationsRouter, blocksRouter, roomsRouter } from "@/routes/accommodation.routes";
import { announcementsRouter } from "@/routes/announcements.routes";
import { attendeesRouter } from "@/routes/attendees.routes";
import { auditRouter } from "@/routes/audit.routes";
import { authRouter } from "@/routes/auth.routes";
import { certificatesRouter } from "@/routes/certificates.routes";
import { campaignsRouter, providersRouter, templatesRouter } from "@/routes/communications.routes";
import { conferencesRouter } from "@/routes/conferences.routes";
import { controlRoomRouter } from "@/routes/control-room.routes";
import { customFieldsRouter } from "@/routes/custom-fields.routes";
import { dashboardRouter } from "@/routes/dashboard.routes";
import { feedbackRouter } from "@/routes/feedback.routes";
import { filesRouter } from "@/routes/files.routes";
import { financeItemsRouter, financeSummaryRouter } from "@/routes/finance.routes";
import { foodPlansRouter, mealScansRouter } from "@/routes/food.routes";
import { helpdeskRouter } from "@/routes/helpdesk.routes";
import { importsRouter } from "@/routes/imports.routes";
import { logisticsRouter } from "@/routes/logistics.routes";
import { membersRouter } from "@/routes/members.routes";
import { sessionSpeakersRouter, sessionsRouter, speakersRouter, tracksRouter, venuesRouter } from "@/routes/programme.routes";
import { realtimeRouter } from "@/routes/realtime.routes";
import { reportsRouter } from "@/routes/reports.routes";
import { settingsRouter } from "@/routes/settings.routes";
import { sponsorsRouter } from "@/routes/sponsors.routes";
import { assignmentsRouter, committeesRouter, staffRouter } from "@/routes/staff.routes";
import { travelRouter, vehiclesRouter } from "@/routes/travel.routes";
import { vipChecklistRouter, vipRouter } from "@/routes/vip.routes";
import { conferences } from "@conference/db";
import { conferenceUpdateSchema } from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";





export function buildApp() {
	const app = new Hono<AppContext>();

	app.use("*", requestIdMiddleware);
	app.use(
		"*",
		cors({
			origin: [env.WEB_BASE_URL, env.API_BASE_URL],
			credentials: true,
			allowHeaders: ["Content-Type", "Authorization", "X-Request-Id"],
			allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
			maxAge: 600,
		}),
	);
	app.use("*", secureHeaders());
	app.use("*", requestLogMiddleware);
	app.get("/", c => c.redirect(env.WEB_BASE_URL));
	app.get("/health", c => c.json({ ok: true, service: "@conference/api" }));
	app.on(["GET", "POST"], "/api/auth/*", c => auth.handler(c.req.raw));

	const api = new Hono<AppContext>();
	api.route("/auth", authRouter);
	api.route("/conferences", conferencesRouter);

	const tenantIndex = (c: any) =>
		c.json({ conference: c.get("conference"), membership: c.get("membership") });
	api.get("/c/:conferenceSlug", loadAuthUser, resolveConference, tenantIndex);
	api.get("/c/:conferenceSlug/", loadAuthUser, resolveConference, tenantIndex);
	api.patch(
		"/c/:conferenceSlug",
		loadAuthUser,
		resolveConference,
		requireRole("admin"),
		zValidator("json", conferenceUpdateSchema),
		async c => {
			const user = c.get("user")!;
			const conf = c.get("conference")!;
			const input = c.req.valid("json");

			const updated = await withTenant(conf.id, async tx => {
				const [before] = await tx
					.select()
					.from(conferences)
					.where(and(eq(conferences.id, conf.id), isNull(conferences.deletedAt)))
					.limit(1);
				if (!before) throw new NotFoundError("conference");

				const updateValues = {
					...input,
					updatedBy: user.id,
					updatedAt: new Date(),
				} as any;

				const [result] = await tx
					.update(conferences)
					.set(updateValues)
					.where(eq(conferences.id, conf.id))
					.returning();
				if (!result) throw new NotFoundError("conference");

				await recordAudit(tx, {
					conferenceId: conf.id,
					userId: user.id,
					action: "update",
					entity: "conference",
					entityId: conf.id,
					before,
					after: result,
					ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
					userAgent: c.req.header("user-agent") ?? null,
					requestId: c.get("requestId"),
				});

				return result;
			});

			return c.json({ conference: updated });
		},
	);

	const tenant = new Hono<AppContext>();
	tenant.use("*", loadAuthUser);
	tenant.use("*", resolveConference);

	tenant.route("/dashboard", dashboardRouter);
	tenant.route("/members", membersRouter);

	tenant.route("/committees", committeesRouter);
	tenant.route("/staff", staffRouter);
	tenant.route("/assignments", assignmentsRouter);

	tenant.route("/attendees", attendeesRouter);

	tenant.route("/vehicles", vehiclesRouter);
	tenant.route("/travel", travelRouter);

	tenant.route("/accommodation/blocks", blocksRouter);
	tenant.route("/accommodation/rooms", roomsRouter);
	tenant.route("/accommodation/allocations", allocationsRouter);
	tenant.route("/accommodation/issues", accommodationIssuesRouter);

	tenant.route("/food/plans", foodPlansRouter);
	tenant.route("/food/scans", mealScansRouter);

	tenant.route("/programme/venues", venuesRouter);
	tenant.route("/programme/tracks", tracksRouter);
	tenant.route("/programme/speakers", speakersRouter);
	tenant.route("/programme/sessions", sessionsRouter);
	tenant.route("/programme/session-speakers", sessionSpeakersRouter);

	tenant.route("/helpdesk", helpdeskRouter);
	tenant.route("/vip", vipRouter);
	tenant.route("/vip-checklist", vipChecklistRouter);

	tenant.route("/certificates", certificatesRouter);
	tenant.route("/feedback", feedbackRouter);
	tenant.route("/announcements", announcementsRouter);
	tenant.route("/logistics", logisticsRouter);
	tenant.route("/control-room", controlRoomRouter);

	tenant.route("/finance", financeSummaryRouter);
	tenant.route("/finance", financeItemsRouter);
	tenant.route("/sponsors", sponsorsRouter);

	tenant.route("/comms/providers", providersRouter);
	tenant.route("/comms/templates", templatesRouter);
	tenant.route("/comms/campaigns", campaignsRouter);

	tenant.route("/imports", importsRouter);
	tenant.route("/reports", reportsRouter);

	tenant.route("/custom-fields", customFieldsRouter);
	tenant.route("/files", filesRouter);
	tenant.route("/settings", settingsRouter);
	tenant.route("/audit", auditRouter);
	tenant.route("/realtime", realtimeRouter);

	api.route("/c/:conferenceSlug", tenant);
	app.route("/api/v1", api);

	app.onError(errorHandler);
	app.notFound(c =>
		c.json(
			{
				error: "not_found",
				message: "The requested resource was not found",
				requestId: c.get("requestId"),
			},
			404,
		),
	);

	return app;
}

export const app = buildApp();
