import type { Database } from "@/db/types";
import { createClient } from "@neondatabase/neon-js";
import { BetterAuthReactAdapter } from "@neondatabase/neon-js/auth/react/adapters";

export const neon = createClient<Database>({
	auth: {
		url: import.meta.env.VITE_NEON_AUTH_URL,
		adapter: BetterAuthReactAdapter(),
	},
	dataApi: {
		url: import.meta.env.VITE_NEON_DATA_API_URL,
	},
});
