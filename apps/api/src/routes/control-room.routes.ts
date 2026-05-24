import { makeCrudRouter } from "@/lib/crud-factory";
import { dailyControlLogs } from "@conference/db";
import { z } from "zod";

export const controlRoomRouter = makeCrudRouter({
	table: dailyControlLogs as any,
	entity: "daily_control_log",
	searchColumns: [
		dailyControlLogs.summary,
		dailyControlLogs.dayLabel,
		dailyControlLogs.shiftLabel,
	],
	defaultSort: dailyControlLogs.logDate,
	createSchema: z.object({
		logDate: z.string().datetime({ offset: true }),
		dayLabel: z.string().max(32).optional(),
		shiftLabel: z.string().max(32).optional(),
		summary: z.string().min(1).max(5000),
		incidents: z.string().max(5000).optional(),
		actionsTaken: z.string().max(5000).optional(),
		pendingActions: z.string().max(5000).optional(),
		stats: z.record(z.string(), z.number()).default({}),
		shiftHeadStaffId: z.string().uuid().optional(),
	}),
	updateSchema: z
		.object({
			logDate: z.string().datetime({ offset: true }),
			dayLabel: z.string().max(32),
			shiftLabel: z.string().max(32),
			summary: z.string().min(1).max(5000),
			incidents: z.string().max(5000),
			actionsTaken: z.string().max(5000),
			pendingActions: z.string().max(5000),
			stats: z.record(z.string(), z.number()),
			shiftHeadStaffId: z.string().uuid().nullable(),
		})
		.partial(),
});
