import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { makeCrudRouter } from "@/lib/crud-factory";
import { NotFoundError } from "@/lib/errors";
import { getClientIp } from "@/lib/http";
import { codes } from "@/lib/id";
import { notifyConference } from "@/lib/notify";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { attendees, helpdeskIssues } from "@conference/db";
import { zValidator } from "@hono/zod-validator";
import { and, eq, sql } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

const helpdeskCreate = z.object({
	attendeeId: z.string().uuid().optional(),
	reportedByName: z.string().max(255).optional(),
	reporterType: z.enum(["attendee", "staff", "guest", "vip", "anonymous"]).default("attendee"),
	category: z.enum([
		"transport",
		"accommodation",
		"food",
		"badge",
		"technical",
		"lost_item",
		"medical",
		"vip",
		"registration",
		"other",
	]),
	title: z.string().min(1).max(255),
	description: z.string().max(5000).optional(),
	priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
	assignedToStaffId: z.string().uuid().optional(),
	assignedCommitteeId: z.string().uuid().optional(),
});

const helpdeskUpdate = z.object({
	status: z.enum(["open", "in_progress", "resolved", "closed", "wont_fix"]).optional(),
	priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
	assignedToStaffId: z.string().uuid().nullable().optional(),
	assignedCommitteeId: z.string().uuid().nullable().optional(),
	resolutionNotes: z.string().max(5000).optional(),
	description: z.string().max(5000).optional(),
});

export const helpdeskRouter = new Hono<AppContext>();

const helpdeskCrud = makeCrudRouter({
	table: helpdeskIssues as any,
	entity: "helpdesk_issue",
	createSchema: helpdeskCreate,
	updateSchema: helpdeskUpdate,
	searchColumns: [helpdeskIssues.title, helpdeskIssues.issueCode],
	defaultSort: helpdeskIssues.createdAt,
	listQuerySchema: z.object({
		status: z.enum(["open", "in_progress", "resolved", "closed", "wont_fix"]).optional(),
		priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
		assignedCommitteeId: z.string().uuid().optional(),
	}),
	applyFilters: filters => {
		const parts = [];
		if (typeof filters.status === "string")
			parts.push(eq(helpdeskIssues.status, filters.status as any));
		if (typeof filters.priority === "string")
			parts.push(eq(helpdeskIssues.priority, filters.priority as any));
		if (typeof filters.assignedCommitteeId === "string")
			parts.push(
				eq(helpdeskIssues.assignedCommitteeId, filters.assignedCommitteeId as string),
			);
		return parts;
	},
	disabledRoutes: ["create"],
});

helpdeskRouter.route("/", helpdeskCrud);
helpdeskRouter.post("/", requireRole("editor"), zValidator("json", helpdeskCreate), async c => {
	const conf = c.get("conference")!;
	const user = c.get("user")!;
	const input = c.req.valid("json");

	const row = await withTenant(conf.id, async tx => {
		const countRows = await tx
			.select({ n: sql<number>`count(*)::int` })
			.from(helpdeskIssues)
			.where(eq(helpdeskIssues.conferenceId, conf.id));
		const issueCode = codes.issue((countRows[0]?.n ?? 0) + 1);

		const reporterInfo = await tx
			.select({
				name: attendees.name,
				phone: attendees.phone,
				type: sql<"attendee" | "staff" | "guest" | "vip" | "anonymous">`
					CASE
						WHEN ${attendees.category} IN
						     ('student', 'faculty', 'industry', 'speaker', 'sponsor', 'media', 'other') THEN 'attendee'
						WHEN ${attendees.category} IN ('organizer') THEN 'staff'
						WHEN ${attendees.category} = 'guest' THEN 'guest'
						WHEN ${attendees.category} = 'vip' THEN 'vip'
						ELSE 'anonymous'
						END
				`.as("type"),
			})
			.from(attendees)
			.where(
				and(eq(attendees.id, input.attendeeId ?? ""), eq(attendees.conferenceId, conf.id)),
			)
			.limit(1)
			.then(r => r[0]);

		const [created] = await tx
			.insert(helpdeskIssues)
			.values({
				...input,
				issueCode,
				conferenceId: conf.id,
				reportedByName:
					input.reporterType === "anonymous" ? input.reportedByName : reporterInfo?.name,
				reporterType:
					input.reporterType === "anonymous"
						? "anonymous"
						: (reporterInfo?.type ?? "anonymous"),
				reporterPhone: reporterInfo?.phone,
				createdBy: user.id,
				updatedBy: user.id,
			} as any)
			.returning();

		await recordAudit(tx, {
			conferenceId: conf.id,
			userId: user.id,
			action: "create",
			entity: "helpdesk_issue",
			entityId: created!.id,
			after: created,
			ip: getClientIp(c),
			userAgent: c.req.header("user-agent") ?? null,
			requestId: c.get("requestId"),
		});

		await notifyConference(tx, conf.id, {
			type: "helpdesk.created",
			entity: "helpdesk_issue",
			id: created!.id,
			meta: {
				issueCode: created!.issueCode,
				title: created!.title,
				priority: created!.priority,
			},
		});
		return created;
	});

	return c.json({ data: row }, 201);
});

helpdeskRouter.post(
	"/:id/transition",
	requireRole("editor"),
	zValidator("param", z.object({ id: z.string().uuid() })),
	zValidator(
		"json",
		z.object({
			to: z.enum(["open", "in_progress", "resolved", "closed", "wont_fix"]),
			resolutionNotes: z.string().max(5000).optional(),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { id } = c.req.valid("param");
		const { to, resolutionNotes } = c.req.valid("json");

		const row = await withTenant(conf.id, async tx => {
			const [before] = await tx
				.select()
				.from(helpdeskIssues)
				.where(and(eq(helpdeskIssues.id, id), eq(helpdeskIssues.conferenceId, conf.id)))
				.limit(1);
			if (!before) throw new NotFoundError("issue");
			const resolvedAt = to === "resolved" || to === "closed" ? new Date() : null;
			const [updated] = await tx
				.update(helpdeskIssues)
				.set({
					status: to,
					resolutionNotes: resolutionNotes ?? before.resolutionNotes,
					resolvedAt: resolvedAt ?? before.resolvedAt,
					updatedBy: user.id,
					updatedAt: new Date(),
				})
				.where(eq(helpdeskIssues.id, id))
				.returning();
			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "update",
				entity: "helpdesk_issue.transition",
				entityId: id,
				before,
				after: updated,
				ip: getClientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});

			if (
				before.status !== "resolved" &&
				before.status !== "closed" &&
				(to === "resolved" || to === "closed")
			) {
				await notifyConference(tx, conf.id, {
					type: "helpdesk.resolved",
					entity: "helpdesk_issue",
					id,
					meta: {
						issueCode: updated!.issueCode,
						title: updated!.title,
						status: updated!.status,
					},
				});
			}
			return updated;
		});
		return c.json({ data: row });
	},
);
