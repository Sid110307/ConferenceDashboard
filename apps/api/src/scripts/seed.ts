


import "@/lib/env";

import { auth } from "@/auth";
import { db } from "@/lib/tenancy";
import { accounts, users } from "@conference/db";
import { and, eq } from "drizzle-orm";





async function main() {
	const email = process.env.SEED_SUPERADMIN_EMAIL;
	const password = process.env.SEED_SUPERADMIN_PASSWORD;

	if (!email || !password) {
		console.error("SEED_SUPERADMIN_EMAIL and SEED_SUPERADMIN_PASSWORD must be set");
		process.exit(1);
	}

	const normalizedEmail = email.toLowerCase();
	console.log(`Seeding super admin: ${normalizedEmail}`);

	const existing = await db
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, normalizedEmail))
		.limit(1);
	let userId: string;

	if (existing.length === 0) {
		const result = await auth.api.signUpEmail({
			body: {
				email: normalizedEmail,
				password,
				name: "Platform Super Admin",
			},
		});

		userId = result.user.id;
		console.log("Created user");
	} else {
		userId = existing[0]!.id;

		const credentialAccount = await db
			.select({ id: accounts.id })
			.from(accounts)
			.where(and(eq(accounts.userId, userId), eq(accounts.providerId, "credential")))
			.limit(1);
		if (credentialAccount.length === 0) {
			await auth.api.setPassword({ body: { newPassword: password } });
			console.warn("User already exists but has no credential account.");
		}

		console.log("User already exists");
	}

	await db
		.update(users)
		.set({
			isPlatformAdmin: true,
			emailVerified: true,
			isActive: true,
			updatedAt: new Date(),
		})
		.where(eq(users.id, userId));

	console.log(`Super admin ready: ${normalizedEmail}`);
	process.exit(0);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
