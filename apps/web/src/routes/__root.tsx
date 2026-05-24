import { queryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { createRootRoute, Outlet } from "@tanstack/react-router";

import { ConfirmProvider } from "@/components/ConfirmDialog";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Pending } from "@/components/Pending";
import { ToastProvider } from "@/components/Toast";

export const Route = createRootRoute({
	component: RootLayout,
	errorComponent: ErrorBoundary,
	pendingComponent: Pending,
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
		</QueryClientProvider>
	);
}
