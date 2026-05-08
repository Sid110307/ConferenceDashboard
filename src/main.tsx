import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";

import App from "@/App";
import { neon } from "@/db/neon";
import { NeonAuthUIProvider } from "@neondatabase/neon-js/auth/react/ui";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "@neondatabase/neon-js/ui/css";
import "@/index.css";

const qc = new QueryClient();

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<QueryClientProvider client={qc}>
			<NeonAuthUIProvider authClient={neon.auth} emailOTP social={{ providers: ["google"] }}>
				<BrowserRouter>
					<App />
				</BrowserRouter>
			</NeonAuthUIProvider>
		</QueryClientProvider>
	</StrictMode>,
);
