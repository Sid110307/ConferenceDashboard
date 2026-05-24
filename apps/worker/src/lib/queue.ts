import { env } from "@/lib/env";
import { createRedis } from "@conference/infra";
import { Queue, type JobsOptions } from "bullmq";

const connection = createRedis({ url: env.REDIS_URL });

export const importsQueue = new Queue("imports", { connection });
export const commsQueue = new Queue("comms", { connection });
export const reportsQueue = new Queue("reports", { connection });
export const maintenanceQueue = new Queue("maintenance", { connection });

export const defaultJobOptions: JobsOptions = {
	attempts: 3,
	backoff: { type: "exponential", delay: 2000 },
	removeOnComplete: { age: 60 * 60 * 24, count: 5000 },
	removeOnFail: { age: 60 * 60 * 24 * 7 },
};

export const JOB_NAMES = {
	IMPORT_PREVIEW: "import.preview",
	IMPORT_START: "import.start",
	IMPORT_ROLLBACK: "import.rollback",
	CAMPAIGN_MATERIALISE: "campaign.materialise",
	CAMPAIGN_DISPATCH_BATCH: "campaign.dispatch_batch",
	REPORT_GENERATE: "report.generate",
	MAINT_CLEAN_OLD_TOKENS: "maint.clean_old_tokens",
	MAINT_CLEAN_OLD_FILES: "maint.clean_old_files",
} as const;
