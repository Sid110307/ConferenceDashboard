export const env = {
	S3_ENDPOINT: process.env.S3_ENDPOINT,
	S3_REGION: process.env.S3_REGION ?? "us-east-1",
	S3_BUCKET: process.env.S3_BUCKET ?? "conference-dashboard",
	S3_ACCESS_KEY: process.env.S3_ACCESS_KEY,
	S3_SECRET_KEY: process.env.S3_SECRET_KEY,
} as const;
