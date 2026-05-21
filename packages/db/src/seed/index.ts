import "dotenv/config";

import { dbAdmin } from "@/client";
import { users } from "./auth";
import { applyRowLevelSecurity } from "./rls";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";





async function main() {
	console.log("Applying RLS policies...");
	await applyRowLevelSecurity(dbAdmin);

	const email = process.env.SEED_SUPERADMIN_EMAIL;
	const password = process.env.SEED_SUPERADMIN_PASSWORD;

	if (!email || !password) {
		console.error(
			"SEED_SUPERADMIN_EMAIL and SEED_SUPERADMIN_PASSWORD must be set in environment",
		);
		process.exit(1);
	}

	console.log("Seeding super admin user...");
	const existing = await dbAdmin
		.select({ id: users.id })
		.from(users)
		.where(eq(users.email, email))
		.limit(1);

	if (existing.length === 0) {
		const hashed = await bcrypt.hash(password, 12);
		await dbAdmin.insert(users).values({
			email,
			name: "Platform Super Admin",
			hashedPassword: hashed,
			isPlatformAdmin: true,
			emailVerified: new Date(),
		});
		console.log(`Super Admin created with email: ${email} and password: ${password}`);
	} else {
		await dbAdmin.update(users).set({ isPlatformAdmin: true }).where(eq(users.email, email));
		console.log(`Super Admin already exists with email: ${email}.`);
	}

	console.log("Seeding completed.");
	process.exit(0);
}

main().catch(err => {
	console.error(err);
	process.exit(1);
});
