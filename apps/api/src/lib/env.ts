import { z } from "zod";

const schema = z.object({
	NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
	LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace"]).default("info"),

	HOST: z.string().default("0.0.0.0"),
	PORT: z.coerce.number().int().default(3001),

	API_BASE_URL: z.string().url().default("http://localhost:3001"),
	WEB_BASE_URL: z.string().url().default("http://localhost:5173"),

	DATABASE_URL: z.string(),
	DATABASE_URL_DIRECT: z.string().optional(),
	DATABASE_POOL_MAX: z.coerce.number().int().default(20),
	DATABASE_SSL: z
		.string()
		.optional()
		.transform(v => v === "true"),

	AUTH_SECRET: z.string().min(32),
	GOOGLE_CLIENT_ID: z.string().optional(),
	GOOGLE_CLIENT_SECRET: z.string().optional(),

	ENCRYPTION_KEY: z
		.string()
		.refine(
			v => Buffer.from(v, "base64").length === 32,
			"ENCRYPTION_KEY must be 32 bytes base64-encoded",
		),
	REDIS_URL: z.string().default("redis://redis:6379"),

	S3_ENDPOINT: z.string().url().optional(),
	S3_REGION: z.string().default("us-east-1"),
	S3_BUCKET: z.string().default("conference-dashboard"),
	S3_ACCESS_KEY: z.string().optional(),
	S3_SECRET_KEY: z.string().optional(),
	S3_FORCE_PATH_STYLE: z
		.string()
		.optional()
		.default("true")
		.transform(v => v !== "false"),
	S3_PUBLIC_BASE_URL: z.string().url().optional(),

	IMPORT_MAX_ROWS: z.coerce.number().int().default(50000),
	IMPORT_BATCH_SIZE: z.coerce.number().int().default(500),
	COMMS_EMAIL_RATE_PER_SEC: z.coerce.number().int().default(10),
	COMMS_SMS_RATE_PER_SEC: z.coerce.number().int().default(5),
	COMMS_WA_RATE_PER_SEC: z.coerce.number().int().default(5),

	SESSION_COOKIE_NAME: z.string().default("conf_os_session"),
	SESSION_TTL_DAYS: z.coerce.number().int().default(30),

	TRUST_PROXY: z
		.string()
		.optional()
		.transform(v => v === "true"),
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
	console.error("Invalid environment variables:");
	for (const issue of parsed.error.issues) {
		console.error(`  ${issue.path.join(".")}: ${issue.message}`);
	}
	process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;
