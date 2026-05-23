import { api, ApiError } from "@/lib/api";
import {
	ConferenceProvider,
	type ActiveConference,
	type Membership,
} from "@/lib/ConferenceContext";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";

import { AppHeader } from "@/components/AppHeader";
import { CenterSpinner } from "@/components/EmptyState";
import { Sidebar } from "@/components/Sidebar";

type TenantRoot = {
	conference: ActiveConference;
	membership: Membership;
};

export const Route = createFileRoute("/c/$slug")({
	beforeLoad: async ({ params, location }) => {
		try {
			await api.get<TenantRoot>(`/api/v1/c/${params.slug}/`);
		} catch (err) {
			if (err instanceof ApiError) {
				if (err.status === 401) {
					throw redirect({
						to: "/login",
						search: { next: `${location.pathname}${location.search}${location.hash}` },
					});
				}
				if (err.status === 404) {
					throw redirect({ to: "/" });
				}
			}
			throw err;
		}
	},
	component: ConferenceLayout,
});

function ConferenceLayout() {
	const { slug } = Route.useParams();
	const location = useLocation();

	const { data, isLoading, error } = useQuery<TenantRoot>({
		queryKey: ["tenant", slug],
		queryFn: () => api.get<TenantRoot>(`/api/v1/c/${slug}/`),
		staleTime: 60000,
	});

	return isLoading || !data ? (
		<div className="flex flex-col h-screen">
			<AppHeader />
			<CenterSpinner label="Loading conference..." />
		</div>
	) : error ? (
		<div className="flex flex-col h-screen">
			<AppHeader />
			<div className="flex-1 flex items-center justify-center text-sm text-danger-soft-fg">
				{error instanceof Error ? error.message : "Could not load conference data."}
				<Link to="/" className="ml-2 underline">
					Back to home
				</Link>
			</div>
		</div>
	) : (
		<ConferenceProvider conference={data.conference} membership={data.membership}>
			<div className="flex flex-col h-screen overflow-hidden">
				<AppHeader />
				<div className="flex-1 flex overflow-hidden">
					<Sidebar />
					<main key={location.pathname} className="flex-1 overflow-y-auto">
						<Outlet />
					</main>
				</div>
			</div>
		</ConferenceProvider>
	);
}
