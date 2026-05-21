import type { AppContext } from "@/lib/context";
import { withTenant } from "@/lib/tenancy";
import { requireRole } from "@/middleware/auth";
import {
	accommodationRooms,
	attendees,
	financeItems,
	helpdeskIssues,
	mealScans,
	travelSegments,
} from "@conference/db";
import { and, eq, isNull, sql } from "drizzle-orm";
import { Hono } from "hono";

export const dashboardRouter = new Hono<AppContext>();

dashboardRouter.get("/", requireRole("viewer"), async c => {
	const conf = c.get("conference")!;
	const data = await withTenant(conf.id, async tx => {
		const today = new Date().toISOString().slice(0, 10);

		const [att] = await tx
			.select({
				total: sql<number>`count(*)::int`,
				registered: sql<number>`count(*) FILTER (WHERE registration_status IN ('registered','confirmed'))::int`,
				confirmed: sql<number>`count(*) FILTER (WHERE registration_status = 'confirmed')::int`,
				checkedIn: sql<number>`count(*) FILTER (WHERE checkin_status = 'checked_in')::int`,
				vip: sql<number>`count(*) FILTER (WHERE is_vip = true)::int`,
				badgePrinted: sql<number>`count(*) FILTER (WHERE badge_printed = true)::int`,
				kitCollected: sql<number>`count(*) FILTER (WHERE kit_collected = true)::int`,
				male: sql<number>`count(*) FILTER (WHERE gender = 'male')::int`,
				female: sql<number>`count(*) FILTER (WHERE gender = 'female')::int`,
			})
			.from(attendees)
			.where(and(eq(attendees.conferenceId, conf.id), isNull(attendees.deletedAt)));

		const [travel] = await tx
			.select({
				arrivalsPending: sql<number>`count(*) FILTER (WHERE direction = 'arrival' AND pickup_status IN ('scheduled','en_route'))::int`,
				arrivalsCompleted: sql<number>`count(*) FILTER (WHERE direction = 'arrival' AND pickup_status = 'completed')::int`,
				arrivalsDelayed: sql<number>`count(*) FILTER (WHERE direction = 'arrival' AND pickup_status = 'delayed')::int`,
				departuresPending: sql<number>`count(*) FILTER (WHERE direction = 'departure' AND pickup_status IN ('scheduled','en_route'))::int`,
				departuresCompleted: sql<number>`count(*) FILTER (WHERE direction = 'departure' AND pickup_status = 'completed')::int`,
			})
			.from(travelSegments)
			.where(and(eq(travelSegments.conferenceId, conf.id), isNull(travelSegments.deletedAt)));

		const [acc] = await tx
			.select({
				rooms: sql<number>`count(*)::int`,
				capacity: sql<number>`COALESCE(SUM(capacity), 0)::int`,
				occupied: sql<number>`COALESCE(SUM(occupied_count), 0)::int`,
			})
			.from(accommodationRooms)
			.where(
				and(
					eq(accommodationRooms.conferenceId, conf.id),
					isNull(accommodationRooms.deletedAt),
				),
			);

		const [helpdesk] = await tx
			.select({
				open: sql<number>`count(*) FILTER (WHERE status = 'open')::int`,
				inProgress: sql<number>`count(*) FILTER (WHERE status = 'in_progress')::int`,
				urgent: sql<number>`count(*) FILTER (WHERE priority = 'urgent' AND status IN ('open','in_progress'))::int`,
				resolvedToday: sql<number>`count(*) FILTER (WHERE status = 'resolved' AND resolved_at::date = ${today}::date)::int`,
			})
			.from(helpdeskIssues)
			.where(eq(helpdeskIssues.conferenceId, conf.id));

		const todayMealScans = await tx
			.select({
				mealType: mealScans.mealType,
				count: sql<number>`count(*)::int`,
			})
			.from(mealScans)
			.where(and(eq(mealScans.conferenceId, conf.id), eq(mealScans.mealDate, today)))
			.groupBy(mealScans.mealType);

		const [finance] = await tx
			.select({
				incomeActual: sql<string>`COALESCE(SUM(actual_amount) FILTER (WHERE item_type = 'income'), 0)::text`,
				expenseActual: sql<string>`COALESCE(SUM(actual_amount) FILTER (WHERE item_type = 'expense'), 0)::text`,
			})
			.from(financeItems)
			.where(and(eq(financeItems.conferenceId, conf.id), isNull(financeItems.deletedAt)));

		return {
			attendees: att,
			travel,
			accommodation: acc,
			helpdesk,
			mealsToday: todayMealScans,
			finance,
		};
	});
	return c.json({ data });
});
