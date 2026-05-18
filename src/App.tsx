import { Suspense, useEffect, useMemo, useState } from "react";
import { Link, Outlet, Route, Routes, useLocation, useNavigate, useParams } from "react-router";

import { useConferenceDetails } from "@/db/hooks/conferences";
import { neon } from "@/db/neon";
import type { Database } from "@/db/types";
import { ChevronDown, LogOut, Menu, Star } from "lucide-react";

import { PAGES } from "@/pages";
import { AuthPage } from "@/pages/AuthPage.tsx";

import { ConferenceUUIDPicker } from "@/components/ConferenceUUIDPicker";

import { useUserRoles } from "@/core/access";
import { ConferenceProvider } from "@/core/ConferenceContext";
import { Routes as AppRoutes } from "@/core/navigation";
import { NAVIGATION_GROUPS } from "@/core/navigationGroups";
import type { NavGroup, NavItem } from "@/core/types";

type ConferenceRow = Database["public"]["Tables"]["conferences"]["Row"];

const ConferenceDashboardShell = () => {
	const navigate = useNavigate();
	const location = useLocation();
	const { conferenceId } = useParams<{ conferenceId: string }>();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isLoggingOut, setIsLoggingOut] = useState(false);
	const [expanded, setExpanded] = useState<Record<string, boolean>>({
		Participants: true,
		Hospitality: true,
		Programme: true,
		Operations: true,
		Administration: false,
	});

	const toggle = (label: string) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

	const userRoles = useUserRoles();
	const { data: conference } = useConferenceDetails();

	const handleLogout = async () => {
		setIsLoggingOut(true);
		try {
			await neon.auth.signOut();
			navigate("/", { replace: true });
		} catch {
			console.error("Logout failed");
		} finally {
			setIsLoggingOut(false);
		}
	};

	const visibleNavGroups: NavGroup[] = NAVIGATION_GROUPS.map(group => ({
		...group,
		items: group.items.filter(item => item.roles?.some(role => userRoles.includes(role))),
	})).filter(group => group.items.length > 0);
	const allItems = visibleNavGroups.flatMap(group => group.items);

	const currentPageId = useMemo(() => {
		const path = location.pathname;
		const parts = path.split("/").filter(Boolean);

		if (parts[0] !== "c" || !parts[2]) return "dashboard";
		const foundItem = allItems.find(item => {
			const pagePath = parts[2].replace(/-/g, "").toLowerCase();
			return item.id.replace(/-/g, "").toLowerCase() === pagePath;
		});
		return foundItem?.id || "dashboard";
	}, [location.pathname, allItems]);

	const activePage = currentPageId;
	const current = allItems.find(item => item.id === activePage);

	useEffect(() => {
		const activeGroup = visibleNavGroups.find(g => g.items.some(i => i.id === currentPageId));
		const label = activeGroup?.label;
		if (label) {
			setExpanded(prev => (prev[label] ? prev : { ...prev, [label]: true }));
		}
		// visibleNavGroups intentionally omitted: it's a new array each render and would loop.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentPageId]);

	return (
		<div className="flex min-h-dvh overflow-hidden bg-gray-50 text-zinc-900">
			<div className="hidden shrink-0 md:block">
				<Sidebar
					visibleNavGroups={visibleNavGroups}
					activePage={activePage}
					expanded={expanded}
					toggle={toggle}
					setSidebarOpen={setSidebarOpen}
					conference={conference ?? null}
					conferenceId={conferenceId}
				/>
			</div>
			{sidebarOpen && (
				<div className="fixed inset-0 z-50 flex md:hidden">
					<Sidebar
						visibleNavGroups={visibleNavGroups}
						activePage={activePage}
						expanded={expanded}
						toggle={toggle}
						setSidebarOpen={setSidebarOpen}
						conference={conference ?? null}
						conferenceId={conferenceId}
					/>
					<div
						className="flex-1 bg-zinc-950/20 backdrop-blur-[2px]"
						onClick={() => setSidebarOpen(false)}
						role="button"
						aria-label="Close sidebar"
					/>
				</div>
			)}
			<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
				<div className="flex h-14 shrink-0 items-center justify-between border-b border-gray-100 bg-white/95 px-4 shadow-sm">
					<div className="flex items-center gap-3">
						<button
							onClick={() => setSidebarOpen(true)}
							aria-label="Open sidebar"
							className="rounded-md border border-gray-200 bg-white p-1.5 text-zinc-600 transition-colors hover:bg-gray-50 hover:text-zinc-900 md:hidden"
						>
							<Menu size={17} aria-hidden />
						</button>
						<div>
							<p className="text-sm font-semibold text-zinc-900">
								{current?.label || "Dashboard"}
							</p>
							<p className="text-xs text-zinc-500">
								{conference?.short_name || conference?.name || "Conference"}
								{conference?.current_day && ` · Day ${conference.current_day}`}
							</p>
						</div>
					</div>
					<button
						onClick={() => void handleLogout()}
						disabled={isLoggingOut}
						title="Sign out of conference"
						className="flex items-center justify-center gap-2 rounded-md cursor-pointer px-3 py-2 text-xs font-semibold transition-all border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:border-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{isLoggingOut ? (
							<>
								<div className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
								<span className="hidden sm:inline">Logging out...</span>
								<span className="sm:hidden">...</span>
							</>
						) : (
							<>
								<LogOut size={14} />
								<span className="hidden sm:inline">Log out</span>
							</>
						)}
					</button>
				</div>
				<main className="flex-1 overflow-y-auto p-4 lg:p-6">
					<div className="mx-auto w-full max-w-400">
						<Suspense fallback={<div>Loading...</div>}>
							<Outlet />
						</Suspense>
					</div>
					<div className="h-8" />
				</main>
			</div>
		</div>
	);
};

const ConferenceLayout = () => (
	<ConferenceProvider>
		<ConferenceDashboardShell />
	</ConferenceProvider>
);

type SidebarProps = {
	visibleNavGroups: NavGroup[];
	activePage: string;
	expanded: Record<string, boolean>;
	toggle: (label: string) => void;
	setSidebarOpen: (open: boolean) => void;
	conference: ConferenceRow | null;
	conferenceId?: string;
};

const Sidebar = ({
	visibleNavGroups,
	activePage,
	expanded,
	toggle,
	setSidebarOpen,
	conference,
	conferenceId,
}: SidebarProps) => (
	<div className="flex h-dvh w-72 flex-col border-r border-gray-100 bg-white/95">
		<Link to={AppRoutes.dashboard(conferenceId)} className="border-b border-gray-100 p-4">
			<div className="flex items-center gap-3">
				<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-blue-600">
					<Star size={15} className="text-white" />
				</div>
				<div className="min-w-0">
					<p className="truncate text-sm font-semibold text-zinc-900">
						{conference?.short_name || conference?.name || "Conference"}
					</p>
					<p className="text-xs text-zinc-600">
						{conference
							? `${conference.start_date || ""} — ${conference.end_date || ""}`
							: ""}
					</p>
				</div>
			</div>
		</Link>
		<nav className="flex-1 space-y-1 overflow-y-auto p-2">
			{visibleNavGroups.map((group, groupIndex) => {
				return (
					<div key={groupIndex}>
						{group.label === null ? (
							group.items.map((item: NavItem) => (
								<Link
									key={item.id}
									to={
										item.id === "dashboard"
											? AppRoutes.dashboard(conferenceId)
											: AppRoutes[item.id as keyof typeof AppRoutes]?.(
													conferenceId,
												) || ""
									}
									onClick={() => setSidebarOpen(false)}
									aria-label={item.ariaLabel || item.label}
									className={`mb-1 flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
										activePage === item.id
											? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100"
											: "text-zinc-600 hover:bg-gray-50 hover:text-zinc-900"
									}`}
								>
									<item.icon size={15} aria-hidden />
									{item.label}
								</Link>
							))
						) : (
							<div className="mb-1">
								<button
									onClick={() => toggle(group.label as string)}
									aria-expanded={expanded[group.label as string]}
									className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-700 transition-colors hover:text-zinc-900"
								>
									<span>{group.label}</span>
									<ChevronDown
										size={11}
										aria-hidden
										className={`transition-transform ${expanded[group.label as string] ? "rotate-180" : ""}`}
									/>
								</button>
								{expanded[group.label as string] && (
									<div
										className="space-y-0.5"
										role="region"
										aria-label={`${group.label} items`}
									>
										{group.items.map((item: NavItem) => (
											<Link
												key={item.id}
												to={
													item.id === "dashboard"
														? AppRoutes.dashboard(conferenceId)
														: AppRoutes[
																item.id as keyof typeof AppRoutes
															]?.(conferenceId) || ""
												}
												onClick={() => setSidebarOpen(false)}
												aria-label={item.ariaLabel || item.label}
												className={`flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
													activePage === item.id
														? "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-100"
														: "text-zinc-600 hover:bg-gray-50 hover:text-zinc-900"
												}`}
											>
												<item.icon size={14} aria-hidden />
												{item.label}
											</Link>
										))}
									</div>
								)}
							</div>
						)}
					</div>
				);
			})}
		</nav>
		<div className="border-t border-gray-100 p-4 text-center">
			<p className="truncate text-xs font-medium text-zinc-900">
				{conference?.venue_name || ""}
			</p>
			<p className="truncate text-[11px] text-zinc-500">{conference?.venue_address || ""}</p>
		</div>
	</div>
);

export default function App() {
	return (
		<div>
			<Suspense fallback={<div>Loading...</div>}>
				<Routes>
					<Route path="/auth/*" element={<AuthPage />} />
					<Route path="/" element={<ConferenceUUIDPicker />} />
					<Route path="/c/:conferenceId" element={<ConferenceLayout />}>
						<Route index element={<PAGES.dashboard />} />
						<Route path="attendees" element={<PAGES.attendees />} />
						<Route path="attendees/:id" element={<PAGES.attendees />} />
						<Route path="checkin" element={<PAGES.checkin />} />
						<Route path="checkin/:id" element={<PAGES.checkin />} />
						<Route path="accommodation" element={<PAGES.accommodation />} />
						<Route path="accommodation/:id" element={<PAGES.accommodation />} />
						<Route path="travel" element={<PAGES.travel />} />
						<Route path="travel/:id" element={<PAGES.travel />} />
						<Route path="feedback" element={<PAGES.feedback />} />
						<Route path="feedback/:id" element={<PAGES.feedback />} />
						<Route path="food" element={<PAGES.food />} />
						<Route path="food/:day" element={<PAGES.food />} />
						<Route path="schedule" element={<PAGES.schedule />} />
						<Route path="schedule/:day" element={<PAGES.schedule />} />
						<Route path="vip" element={<PAGES.vip />} />
						<Route path="vip/:id" element={<PAGES.vip />} />
						<Route path="logistics" element={<PAGES.logistics />} />
						<Route path="logistics/:id" element={<PAGES.logistics />} />
						<Route path="venue" element={<PAGES.venue />} />
						<Route path="venue/:id" element={<PAGES.venue />} />
						<Route path="volunteers" element={<PAGES.volunteers />} />
						<Route path="volunteers/:id" element={<PAGES.volunteers />} />
						<Route path="helpdesk" element={<PAGES.helpdesk />} />
						<Route path="helpdesk/:id" element={<PAGES.helpdesk />} />
						<Route path="finance" element={<PAGES.finance />} />
						<Route path="finance/:id" element={<PAGES.finance />} />
						<Route path="reports" element={<PAGES.reports />} />
						<Route path="users" element={<PAGES.users />} />
						<Route path="settings" element={<PAGES.settings />} />
					</Route>
					<Route path="*" element={<ConferenceUUIDPicker />} />
				</Routes>
			</Suspense>
		</div>
	);
}
