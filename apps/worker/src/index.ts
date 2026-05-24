import { env } from "@/lib/env";
import { commsQueue, importsQueue, JOB_NAMES, maintenanceQueue, reportsQueue } from "@/lib/queue";
import { processCampaignDispatchBatch } from "@/processors/comms/dispatch";
import { processCampaignMaterialise } from "@/processors/comms/materialise";
import { processImportPreview } from "@/processors/imports/preview";
import { processImportRollback } from "@/processors/imports/rollback";
import { processImportStart } from "@/processors/imports/start";
import { processCleanOldFiles, processCleanOldTokens } from "@/processors/maintenance";
import { processReportGenerate } from "@/processors/reports/generate";
import { createLogger, createRedis } from "@conference/infra";
import { Worker, type Job } from "bullmq";

import "@/lib/env";

const logger = createLogger({
	level: env.LOG_LEVEL,
	service: "@conference/worker",
	env: env.NODE_ENV,
});

const redis = createRedis({ url: env.REDIS_URL, logger });

logger.info(
	{
		nodeEnv: env.NODE_ENV,
		concurrency: {
			imports: env.WORKER_CONCURRENCY_IMPORTS,
			comms: env.WORKER_CONCURRENCY_COMMS,
			reports: env.WORKER_CONCURRENCY_REPORTS,
			maintenance: env.WORKER_CONCURRENCY_MAINTENANCE,
		},
	},
	"worker starting",
);

const importsWorker = new Worker(
	"imports",
	async (job: Job) => {
		const span = { jobId: job.id, name: job.name, queue: "imports" };
		logger.info(span, "job start");
		switch (job.name) {
			case JOB_NAMES.IMPORT_PREVIEW:
				return processImportPreview(job.data);
			case JOB_NAMES.IMPORT_START:
				return processImportStart(job.data);
			case JOB_NAMES.IMPORT_ROLLBACK:
				return processImportRollback(job.data);
			default:
				throw new Error(`Unknown imports job: ${job.name}`);
		}
	},
	{ connection: redis, concurrency: env.WORKER_CONCURRENCY_IMPORTS },
);

const commsWorker = new Worker(
	"comms",
	async (job: Job) => {
		const span = { jobId: job.id, name: job.name, queue: "comms" };
		logger.info(span, "job start");
		switch (job.name) {
			case JOB_NAMES.CAMPAIGN_MATERIALISE:
				return processCampaignMaterialise(job.data);
			case JOB_NAMES.CAMPAIGN_DISPATCH_BATCH:
				return processCampaignDispatchBatch(job.data);
			default:
				throw new Error(`Unknown comms job: ${job.name}`);
		}
	},
	{ connection: redis, concurrency: env.WORKER_CONCURRENCY_COMMS },
);

const reportsWorker = new Worker(
	"reports",
	async (job: Job) => {
		const span = { jobId: job.id, name: job.name, queue: "reports" };
		logger.info(span, "job start");
		switch (job.name) {
			case JOB_NAMES.REPORT_GENERATE:
				return processReportGenerate(job.data);
			default:
				throw new Error(`Unknown reports job: ${job.name}`);
		}
	},
	{ connection: redis, concurrency: env.WORKER_CONCURRENCY_REPORTS },
);

const maintenanceWorker = new Worker(
	"maintenance",
	async (job: Job) => {
		const span = { jobId: job.id, name: job.name, queue: "maintenance" };
		logger.info(span, "job start");
		switch (job.name) {
			case JOB_NAMES.MAINT_CLEAN_OLD_TOKENS:
				return processCleanOldTokens();
			case JOB_NAMES.MAINT_CLEAN_OLD_FILES:
				return processCleanOldFiles();
			default:
				throw new Error(`Unknown maintenance job: ${job.name}`);
		}
	},
	{ connection: redis, concurrency: env.WORKER_CONCURRENCY_MAINTENANCE },
);

for (const [name, w] of [
	["imports", importsWorker],
	["comms", commsWorker],
	["reports", reportsWorker],
	["maintenance", maintenanceWorker],
] as const) {
	w.on("ready", () => logger.info({ queue: name }, "worker ready"));
	w.on("completed", (job, result) =>
		logger.info({ queue: name, jobId: job.id, jobName: job.name, result }, "job ok"),
	);
	w.on("failed", (job, err) =>
		logger.error(
			{
				queue: name,
				jobId: job?.id,
				jobName: job?.name,
				err: String(err?.message ?? err),
				attemptsMade: job?.attemptsMade,
			},
			"job failed",
		),
	);
	w.on("error", err => logger.error({ queue: name, err: String(err) }, "worker error"));
}

async function seedRepeatableJobs() {
	await maintenanceQueue.add(
		JOB_NAMES.MAINT_CLEAN_OLD_TOKENS,
		{},
		{
			repeat: { pattern: "30 3 * * *" },
			jobId: "repeat:clean_old_tokens",
		},
	);
	await maintenanceQueue.add(
		JOB_NAMES.MAINT_CLEAN_OLD_FILES,
		{},
		{
			repeat: { pattern: "0 0 * * *" },
			jobId: "repeat:clean_old_files",
		},
	);
	logger.info("repeatable jobs seeded");
}
seedRepeatableJobs().catch(err =>
	logger.error({ err: String(err) }, "failed to seed repeatable jobs"),
);

async function shutdown(signal: string) {
	logger.info({ signal }, "shutting down workers");
	try {
		await Promise.all([
			importsWorker.close(),
			commsWorker.close(),
			reportsWorker.close(),
			maintenanceWorker.close(),
		]);
		await Promise.all([
			importsQueue.close(),
			commsQueue.close(),
			reportsQueue.close(),
			maintenanceQueue.close(),
		]);
		await redis.quit();
	} catch (err) {
		logger.error({ err: String(err) }, "error during shutdown");
	}
	process.exit(0);
}
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", err => {
	logger.fatal({ err: String(err) }, "uncaughtException");
	process.exit(1);
});
process.on("unhandledRejection", err => {
	logger.fatal({ err: String(err) }, "unhandledRejection");
	process.exit(1);
});
