
import { z } from "zod";

const schema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

	DATABASE_URL: z.string(),
	DATABASE_POOL_MAX: z.coerce.number().int().default(10),
	DATABASE_SSL: z.string().optional().transform((v) => v === "true"),

	REDIS_URL: z.string().default("redis://redis:6379"),
	ENCRYPTION_KEY: z
		.string()
		.refine(
			(v) => Buffer.from(v, "base64").length === 32,
			"ENCRYPTION_KEY must be 32 bytes base64-encoded",
		),

	S3_ENDPOINT: z.string().url().optional(),
	S3_REGION: z.string().default("us-east-1"),
	S3_BUCKET: z.string().default("conference-os"),
	S3_ACCESS_KEY: z.string().optional(),
	S3_SECRET_KEY: z.string().optional(),
	S3_FORCE_PATH_STYLE: z
		.string()
		.optional()
		.default("true")
		.transform((v) => v !== "false"),

	IMPORT_BATCH_SIZE: z.coerce.number().int().default(500),
	IMPORT_MAX_ROWS: z.coerce.number().int().default(50000),

	COMMS_EMAIL_RATE_PER_SEC: z.coerce.number().int().default(10),
	COMMS_SMS_RATE_PER_SEC: z.coerce.number().int().default(5),
	COMMS_WA_RATE_PER_SEC: z.coerce.number().int().default(5),

	WORKER_CONCURRENCY_IMPORTS: z.coerce.number().int().default(2),
	WORKER_CONCURRENCY_COMMS: z.coerce.number().int().default(5),
	WORKER_CONCURRENCY_REPORTS: z.coerce.number().int().default(2),
	WORKER_CONCURRENCY_MAINTENANCE: z.coerce.number().int().default(1),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
	console.error("Invalid worker environment:");
	for (const issue of parsed.error.issues) {
		console.error(`  ${issue.path.join(".")}: ${issue.message}`);
	}
	process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
