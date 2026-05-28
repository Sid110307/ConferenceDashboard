import { env } from "@/lib/env";
import { db, schema } from "@conference/db";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";

const allowedOrigins = [env.WEB_BASE_URL, env.API_BASE_URL].filter(Boolean) as string[];

export const auth = betterAuth({
	baseURL: env.API_BASE_URL,
	secret: env.AUTH_SECRET,
	trustedOrigins: allowedOrigins,
	database: drizzleAdapter(db, {
		provider: "pg",
		schema: {
			user: schema.users,
			account: schema.accounts,
			session: schema.sessions,
			verification: schema.verificationTokens,
		},
	}),
	user: {
		additionalFields: {
			isPlatformAdmin: {
				type: "boolean",
				required: false,
				defaultValue: false,
				input: false,
			},
			isActive: {
				type: "boolean",
				required: false,
				defaultValue: true,
				input: false,
			},
			lastSeenAt: {
				type: "date",
				required: false,
				input: false,
			},
		},
	},
	emailAndPassword: {
		enabled: true,
		minPasswordLength: 8,
		maxPasswordLength: 512,
	},
	socialProviders:
		env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET
			? {
					google: {
						prompt: "select_account",
						clientId: env.GOOGLE_CLIENT_ID,
						clientSecret: env.GOOGLE_CLIENT_SECRET,
						redirectUri: `${env.API_BASE_URL}/api/auth/callback/google`,
					},
				}
			: undefined,
	session: {
		expiresIn: 60 * 60 * 24 * env.SESSION_TTL_DAYS,
		updateAge: 60 * 60 * 24,
		cookieCache: {
			enabled: true,
			maxAge: 60,
		},
		additionalFields: {
			activeConferenceId: {
				type: "string",
				required: false,
				input: false,
			},
		},
	},
	advanced: {
		cookiePrefix: env.SESSION_COOKIE_NAME,
		useSecureCookies: env.NODE_ENV === "production",
		defaultCookieAttributes: {
			httpOnly: true,
			sameSite: env.NODE_ENV === "production" ? "none" : "lax",
			secure: env.NODE_ENV === "production",
		},
	},
});

export type Auth = typeof auth;
