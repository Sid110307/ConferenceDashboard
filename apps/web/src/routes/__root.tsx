import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { createRootRoute, Outlet } from "@tanstack/react-router";
import { TanStackRouterDevtools } from "@tanstack/react-router-devtools";

import { ConfirmProvider } from "@/components/ConfirmDialog";
import { ToastProvider } from "@/components/Toast";

export const Route = createRootRoute({
	component: RootLayout,
});

function RootLayout() {
	return (
		<QueryClientProvider client={queryClient}>
			<ToastProvider>
				<ConfirmProvider>
					<div className="min-h-full bg-app text-ink">
						<Outlet />
					</div>
				</ConfirmProvider>
			</ToastProvider>
			{import.meta.env.DEV && (
				<>
					<TanStackRouterDevtools position="bottom-right" />
					<ReactQueryDevtools buttonPosition="bottom-left" />
				</>
			)}
		</QueryClientProvider>
	);
}
