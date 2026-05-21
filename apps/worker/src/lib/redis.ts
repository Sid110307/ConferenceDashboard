import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import IORedis from "ioredis";

export const redis = new IORedis(env.REDIS_URL, {
	maxRetriesPerRequest: null,
	enableReadyCheck: true,
});

redis.on("error", err => {
	logger.error({ err }, "redis error");
});

export const JOB_NAMES = {
	IMPORT_PREVIEW: "import.preview",
	IMPORT_START: "import.start",
	IMPORT_ROLLBACK: "import.rollback",
	CAMPAIGN_MATERIALISE: "campaign.materialise",
	CAMPAIGN_DISPATCH_BATCH: "campaign.dispatch_batch",
	REPORT_GENERATE: "report.generate",
	MAINT_CLEAN_OLD_TOKENS: "maint.clean_old_tokens",
	MAINT_REFRESH_DASHBOARD: "maint.refresh_dashboard",
} as const;
