import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { makeCrudRouter } from "@/lib/crud-factory";
import { NotFoundError } from "@/lib/errors";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { conferenceSessions, sessionSpeakers, speakers, tracks, venues } from "@conference/db";
import { isoDatetimeSchema } from "@conference/shared";
import { zValidator } from "@hono/zod-validator";
import { and, asc, eq, isNull } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

export const venuesRouter = makeCrudRouter({
	table: venues as any,
	entity: "venue",
	createSchema: z.object({
		name: z.string().min(1).max(255),
		location: z.string().max(255).optional(),
		floor: z.string().max(32).optional(),
		capacity: z.number().int().min(1).max(50000).optional(),
		hasProjector: z.boolean().default(false),
		hasMic: z.boolean().default(false),
		hasAc: z.boolean().default(false),
		hasRecording: z.boolean().default(false),
		notes: z.string().max(2000).optional(),
	}),
	updateSchema: z
		.object({
			name: z.string().min(1).max(255),
			location: z.string().max(255),
			floor: z.string().max(32),
			capacity: z.number().int().min(1).max(50000),
			hasProjector: z.boolean(),
			hasMic: z.boolean(),
			hasAc: z.boolean(),
			hasRecording: z.boolean(),
			notes: z.string().max(2000),
		})
		.partial(),
	searchColumns: [venues.name, venues.location],
	defaultSort: venues.name,
});

export const tracksRouter = makeCrudRouter({
	table: tracks as any,
	entity: "track",
	createSchema: z.object({
		name: z.string().min(1).max(120),
		code: z.string().max(32).optional(),
		color: z.string().max(16).optional(),
		description: z.string().max(2000).optional(),
		sortOrder: z.number().int().default(0),
	}),
	updateSchema: z
		.object({
			name: z.string().min(1).max(120),
			code: z.string().max(32),
			color: z.string().max(16),
			description: z.string().max(2000),
			sortOrder: z.number().int(),
		})
		.partial(),
	searchColumns: [tracks.name, tracks.code],
	defaultSort: tracks.sortOrder,
});

export const speakersRouter = makeCrudRouter({
	table: speakers as any,
	entity: "speaker",
	customFieldEntity: "speakers",
	createSchema: z.object({
		name: z.string().min(1).max(255),
		salutation: z.string().max(16).optional(),
		designation: z.string().max(255).optional(),
		institution: z.string().max(255).optional(),
		bio: z.string().max(5000).optional(),
		email: z.string().email().optional(),
		phone: z.string().max(32).optional(),
		website: z.string().url().optional(),
		photoFileId: z.string().uuid().optional(),
		isVip: z.boolean().default(false),
		sortOrder: z.number().int().default(0),
		notes: z.string().max(2000).optional(),
		customFields: z.record(z.string(), z.any()).default({}),
	}),
	updateSchema: z
		.object({
			name: z.string().min(1).max(255),
			salutation: z.string().max(16),
			designation: z.string().max(255),
			institution: z.string().max(255),
			bio: z.string().max(5000),
			email: z.string().email(),
			phone: z.string().max(32),
			website: z.string().url(),
			photoFileId: z.string().uuid(),
			isVip: z.boolean(),
			sortOrder: z.number().int(),
			notes: z.string().max(2000),
			customFields: z.record(z.string(), z.any()),
		})
		.partial(),
	searchColumns: [speakers.name, speakers.institution],
	defaultSort: speakers.sortOrder,
});

export const sessionsRouter = makeCrudRouter({
	table: conferenceSessions as any,
	entity: "session",
	customFieldEntity: "sessions",
	createSchema: z.object({
		title: z.string().min(1).max(500),
		description: z.string().max(5000).optional(),
		sessionType: z
			.enum([
				"keynote",
				"plenary",
				"invited",
				"contributed",
				"poster",
				"panel",
				"workshop",
				"break",
				"cultural",
				"other",
			])
			.default("invited"),
		startTime: isoDatetimeSchema,
		endTime: isoDatetimeSchema,
		trackId: z.string().uuid().optional(),
		venueId: z.string().uuid().optional(),
		publicStatus: z.enum(["draft", "published", "archived"]).default("draft"),
		notes: z.string().max(2000).optional(),
		customFields: z.record(z.string(), z.any()).default({}),
	}),
	updateSchema: z
		.object({
			title: z.string().min(1).max(500),
			description: z.string().max(5000),
			sessionType: z.enum([
				"keynote",
				"plenary",
				"invited",
				"contributed",
				"poster",
				"panel",
				"workshop",
				"break",
				"cultural",
				"other",
			]),
			startTime: isoDatetimeSchema,
			endTime: isoDatetimeSchema,
			trackId: z.string().uuid().nullable(),
			venueId: z.string().uuid().nullable(),
			status: z.enum(["upcoming", "ongoing", "done", "cancelled"]),
			publicStatus: z.enum(["draft", "published", "archived"]),
			notes: z.string().max(2000),
			customFields: z.record(z.string(), z.any()),
		})
		.partial(),
	searchColumns: [conferenceSessions.title],
	defaultSort: conferenceSessions.startTime,
	sortMap: {
		startTime: conferenceSessions.startTime,
		title: conferenceSessions.title,
	},
	listQuerySchema: z.object({
		trackId: z.string().uuid().optional(),
		venueId: z.string().uuid().optional(),
		sessionType: z
			.enum([
				"keynote",
				"plenary",
				"invited",
				"contributed",
				"poster",
				"panel",
				"workshop",
				"break",
				"cultural",
				"other",
			])
			.optional(),
	}),
	applyFilters: filters => {
		const parts = [];
		if (typeof filters.trackId === "string")
			parts.push(eq(conferenceSessions.trackId, filters.trackId as string));
		if (typeof filters.venueId === "string")
			parts.push(eq(conferenceSessions.venueId, filters.venueId as string));
		if (typeof filters.sessionType === "string")
			parts.push(eq(conferenceSessions.sessionType, filters.sessionType as any));
		return parts;
	},
});

export const sessionSpeakersRouter = new Hono<AppContext>();

sessionSpeakersRouter.get(
	"/:sessionId",
	requireRole("viewer"),
	zValidator("param", z.object({ sessionId: z.string().uuid() })),
	async c => {
		const conf = c.get("conference")!;
		const { sessionId } = c.req.valid("param");
		const rows = await withTenant(conf.id, async tx =>
			tx
				.select({
					id: sessionSpeakers.id,
					speakerId: speakers.id,
					name: speakers.name,
					salutation: speakers.salutation,
					designation: speakers.designation,
					institution: speakers.institution,
					role: sessionSpeakers.role,
					sortOrder: sessionSpeakers.sortOrder,
				})
				.from(sessionSpeakers)
				.innerJoin(speakers, eq(speakers.id, sessionSpeakers.speakerId))
				.where(
					and(
						eq(sessionSpeakers.sessionId, sessionId),
						eq(sessionSpeakers.conferenceId, conf.id),
						isNull(speakers.deletedAt),
					),
				)
				.orderBy(asc(sessionSpeakers.sortOrder)),
		);
		return c.json({ data: rows });
	},
);

sessionSpeakersRouter.post(
	"/:sessionId",
	requireRole("editor"),
	zValidator("param", z.object({ sessionId: z.string().uuid() })),
	zValidator(
		"json",
		z.object({
			speakerId: z.string().uuid(),
			role: z.string().max(32).optional(),
			sortOrder: z.number().int().default(0),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { sessionId } = c.req.valid("param");
		const input = c.req.valid("json");
		const row = await withTenant(conf.id, async tx => {
			const [s] = await tx
				.select({ id: conferenceSessions.id })
				.from(conferenceSessions)
				.where(
					and(
						eq(conferenceSessions.id, sessionId),
						eq(conferenceSessions.conferenceId, conf.id),
					),
				)
				.limit(1);
			if (!s) throw new NotFoundError("session");

			const [r] = await tx
				.insert(sessionSpeakers)
				.values({
					conferenceId: conf.id,
					sessionId,
					...input,
				})
				.onConflictDoUpdate({
					target: [sessionSpeakers.sessionId, sessionSpeakers.speakerId],
					set: {
						role: input.role ?? null,
						sortOrder: input.sortOrder ?? 0,
					},
				})
				.returning();

			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "create",
				entity: "session_speaker",
				entityId: r!.id,
				after: r,
				ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
			return r;
		});
		return c.json({ data: row }, 201);
	},
);

sessionSpeakersRouter.delete(
	"/:sessionId/:speakerId",
	requireRole("editor"),
	zValidator(
		"param",
		z.object({
			sessionId: z.string().uuid(),
			speakerId: z.string().uuid(),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { sessionId, speakerId } = c.req.valid("param");
		await withTenant(conf.id, async tx => {
			await tx
				.delete(sessionSpeakers)
				.where(
					and(
						eq(sessionSpeakers.sessionId, sessionId),
						eq(sessionSpeakers.speakerId, speakerId),
						eq(sessionSpeakers.conferenceId, conf.id),
					),
				);
			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "delete",
				entity: "session_speaker",
				meta: { sessionId, speakerId },
				ip: c.req.header("x-forwarded-for")?.split(",")[0] ?? null,
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
		});
		return c.json({ deleted: true });
	},
);
