import { recordAudit } from "@/lib/audit";
import type { AppContext } from "@/lib/context";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import { appSettings, themeSettings } from "@conference/db";
import { zValidator } from "@hono/zod-validator";
import { eq } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";

function clientIp(c: any) {
	return c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
}

export const settingsRouter = new Hono<AppContext>();

settingsRouter.get("/app", requireRole("viewer"), async c => {
	const conf = c.get("conference")!;
	const rows = await withTenant(conf.id, async tx =>
		tx.select().from(appSettings).where(eq(appSettings.conferenceId, conf.id)),
	);
	const obj: Record<string, any> = {};
	for (const r of rows) obj[r.settingKey] = r.settingValue;
	return c.json({ data: obj });
});

settingsRouter.put(
	"/app/:key",
	requireRole("admin"),
	zValidator("param", z.object({ key: z.string().min(1).max(128) })),
	zValidator("json", z.object({ value: z.any() })),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const { key } = c.req.valid("param");
		const { value } = c.req.valid("json");
		const row = await withTenant(conf.id, async tx => {
			const [r] = await tx
				.insert(appSettings)
				.values({
					conferenceId: conf.id,
					settingKey: key,
					settingValue: value,
					createdBy: user.id,
					updatedBy: user.id,
				})
				.onConflictDoUpdate({
					target: [appSettings.conferenceId, appSettings.settingKey],
					set: { settingValue: value, updatedBy: user.id, updatedAt: new Date() },
				})
				.returning();
			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "update",
				entity: "app_setting",
				entityId: r!.id,
				meta: { key },
				ip: clientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
			return r;
		});
		return c.json({ data: row });
	},
);

settingsRouter.get("/theme", requireRole("viewer"), async c => {
	const conf = c.get("conference")!;
	const row = await withTenant(conf.id, async tx => {
		const [r] = await tx
			.select()
			.from(themeSettings)
			.where(eq(themeSettings.conferenceId, conf.id))
			.limit(1);
		return r;
	});
	return c.json({ data: row ?? null });
});

settingsRouter.put(
	"/theme",
	requireRole("admin"),
	zValidator(
		"json",
		z.object({
			primaryColor: z.string().max(16).optional(),
			secondaryColor: z.string().max(16).optional(),
			accentColor: z.string().max(16).optional(),
			logoFileId: z.string().uuid().nullable().optional(),
			faviconFileId: z.string().uuid().nullable().optional(),
			heroImageFileId: z.string().uuid().nullable().optional(),
			tokens: z.record(z.string(), z.any()).optional(),
		}),
	),
	async c => {
		const conf = c.get("conference")!;
		const user = c.get("user")!;
		const input = c.req.valid("json");
		const row = await withTenant(conf.id, async tx => {
			const [r] = await tx
				.insert(themeSettings)
				.values({
					conferenceId: conf.id,
					...input,
					createdBy: user.id,
					updatedBy: user.id,
				})
				.onConflictDoUpdate({
					target: themeSettings.conferenceId,
					set: { ...input, updatedBy: user.id, updatedAt: new Date() },
				})
				.returning();
			await recordAudit(tx, {
				conferenceId: conf.id,
				userId: user.id,
				action: "update",
				entity: "theme_settings",
				entityId: r!.id,
				ip: clientIp(c),
				userAgent: c.req.header("user-agent") ?? null,
				requestId: c.get("requestId"),
			});
			return r;
		});
		return c.json({ data: row });
	},
);
