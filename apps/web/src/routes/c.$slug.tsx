import type { CSSProperties } from "react";

import { api, ApiError } from "@/lib/api";
import {
	ConferenceProvider,
	type ActiveConference,
	type Membership,
} from "@/lib/ConferenceContext";
import { queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, redirect, useLocation } from "@tanstack/react-router";

import { AppHeader } from "@/components/AppHeader";
import { CenterSpinner } from "@/components/EmptyState";
import { Sidebar } from "@/components/Sidebar";

type TenantRoot = {
	conference: ActiveConference;
	membership: Membership;
};

type ThemeSettings = {
	primaryColor?: string | null;
	secondaryColor?: string | null;
	accentColor?: string | null;
};

export const Route = createFileRoute("/c/$slug")({
	beforeLoad: async ({ params, location }) => {
		try {
			await queryClient.ensureQueryData({
				queryKey: ["tenant", params.slug],
				queryFn: () => api.get<TenantRoot>(`/api/v1/c/${params.slug}/`),
				staleTime: 60000,
			});
		} catch (err) {
			if (err instanceof ApiError) {
				if (err.status === 401)
					throw redirect({
						to: "/login",
						search: { next: `${location.pathname}${location.search}${location.hash}` },
					});
				if (err.status === 404) throw redirect({ to: "/" });
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
	const { data: themeData } = useQuery<{ data: ThemeSettings }>({
		queryKey: ["conf-theme", slug],
		queryFn: () => api.get<{ data: ThemeSettings }>(`/api/v1/c/${slug}/settings/theme`),
		staleTime: 60000,
	});

	const themeStyle = {
		"--conference-primary-color": themeData?.data?.primaryColor ?? undefined,
		"--conference-secondary-color": themeData?.data?.secondaryColor ?? undefined,
		"--conference-accent-color": themeData?.data?.accentColor ?? undefined,
	} as CSSProperties;

	return isLoading || !data ? (
		<div className="flex flex-col h-screen">
			<AppHeader />
			<CenterSpinner />
		</div>
	) : error ? (
		<div className="flex flex-col h-screen">
			<AppHeader />
			<div className="flex-1 flex flex-col items-center justify-center text-sm text-danger-soft-fg">
				{error instanceof Error ? error.message : "Could not load conference data."}
				<Link to="/" className="ml-2 underline">
					Back to home
				</Link>
			</div>
		</div>
	) : (
		<ConferenceProvider conference={data.conference} membership={data.membership}>
			<div
				className="conference-theme flex flex-col h-screen overflow-hidden"
				style={themeStyle}
			>
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
