import { Suspense, useState } from "react";
import { Link, Route, Routes, useLocation } from "react-router";

import { ChevronDown, ChevronRight, Menu, Star } from "lucide-react";

import { PAGES } from "@/pages";

import { getUserRoles, hasAccess } from "@/core/access";
import { DATA, NAV_GROUPS } from "@/core/data";
import { Routes as AppRoutes } from "@/core/navigation";

type ExpandKey = string;
export default function App() {
	const location = useLocation();
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [expanded, setExpanded] = useState<Record<ExpandKey, boolean>>({});

	const toggle = (label: ExpandKey) => setExpanded(prev => ({ ...prev, [label]: !prev[label] }));

	const userRoles = getUserRoles();
	const visibleNavGroups = NAV_GROUPS.map(group => ({
		...group,
		items: group.items.filter(item => hasAccess(userRoles, item.roles)),
	})).filter(group => group.items.length > 0);
	const allItems = visibleNavGroups.flatMap(group => group.items);

	const getCurrentPageId = () => {
		const path = location.pathname;
		if (path === "/") return "dashboard";
		const segment = path.split("/")[1];
		const foundItem = allItems.find(item => {
			const pagePath = segment.replace(/-/g, "").toLowerCase();
			return item.id.replace(/-/g, "").toLowerCase() === pagePath;
		});
		return foundItem?.id || "dashboard";
	};
	const activePage = getCurrentPageId();
	const current = allItems.find(item => item.id === activePage);

	const Sidebar = () => (
		<div className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
			<Link to={AppRoutes.dashboard()} className="border-b border-gray-200 p-4">
				<div className="flex items-center gap-3">
					<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
						<Star size={15} className="text-white" />
					</div>
					<div className="min-w-0">
						<p className="truncate text-sm font-semibold text-zinc-900">
							{DATA.meta.shortName}
						</p>
						<p className="text-xs text-zinc-600">{DATA.meta.dates}</p>
					</div>
				</div>
			</Link>
			<nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
				{visibleNavGroups.map((group, groupIndex) => {
					return (
						<div key={groupIndex}>
							{group.label === null ? (
								group.items.map(item => (
									<Link
										key={item.id}
										to={
											item.id === "dashboard"
												? AppRoutes.dashboard()
												: AppRoutes[
														item.id as keyof typeof AppRoutes
													]?.() || "/"
										}
										onClick={() => setSidebarOpen(false)}
										aria-label={item.ariaLabel || item.label}
										className={`mb-1 flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors ${
											activePage === item.id
												? "bg-blue-600 text-white"
												: "text-zinc-600 hover:bg-gray-100 hover:text-zinc-900"
										}`}
									>
										<item.icon size={15} aria-hidden />
										{item.label}
									</Link>
								))
							) : (
								<div className="mb-1">
									<button
										onClick={() => toggle(group.label as ExpandKey)}
										aria-expanded={expanded[group.label as ExpandKey]}
										className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-zinc-700 transition-colors hover:text-zinc-900"
									>
										<span>{group.label}</span>
										<ChevronDown
											size={11}
											aria-hidden
											className={`transition-transform ${expanded[group.label as ExpandKey] ? "rotate-180" : ""}`}
										/>
									</button>
									{expanded[group.label as ExpandKey] && (
										<div
											className="space-y-0.5"
											role="region"
											aria-label={`${group.label} items`}
										>
											{group.items.map(item => (
												<Link
													key={item.id}
													to={
														item.id === "dashboard"
															? AppRoutes.dashboard()
															: AppRoutes[
																	item.id as keyof typeof AppRoutes
																]?.() || "/"
													}
													onClick={() => setSidebarOpen(false)}
													aria-label={item.ariaLabel || item.label}
													className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
														activePage === item.id
															? "bg-blue-600 text-white"
															: "text-zinc-600 hover:bg-gray-100 hover:text-zinc-900"
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
			<div className="border-t border-gray-200 p-3">
				<p className="truncate text-center text-xs text-zinc-700">{DATA.meta.venue}</p>
			</div>
		</div>
	);

	return (
		<div className="flex h-screen overflow-hidden bg-gray-50 text-zinc-900">
			<div className="hidden shrink-0 lg:block">
				<Sidebar />
			</div>
			{sidebarOpen && (
				<div className="fixed inset-0 z-50 flex lg:hidden">
					<Sidebar />
					<div
						className="flex-1 bg-black/60"
						onClick={() => setSidebarOpen(false)}
						role="button"
						aria-label="Close sidebar"
					/>
				</div>
			)}
			<div className="flex min-w-0 flex-1 flex-col overflow-hidden">
				<div className="flex shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-4 py-2.5">
					<button
						onClick={() => setSidebarOpen(true)}
						aria-label="Open sidebar"
						className="rounded-lg bg-gray-100 p-1.5 text-zinc-600 transition-colors hover:text-zinc-900 lg:hidden"
					>
						<Menu size={17} aria-hidden />
					</button>
					<div className="flex flex-1 items-center gap-1.5 text-xs text-zinc-600">
						<span>{DATA.meta.shortName}</span>
						<ChevronRight size={12} />
						<span className="text-zinc-500">{current?.label || "Dashboard"}</span>
					</div>
				</div>
				<div className="flex-1 overflow-y-auto p-4 lg:p-6">
					<Suspense fallback={<div>Loading...</div>}>
						<Routes>
							<Route path="/" element={<PAGES.dashboard />} />
							<Route path="/attendees" element={<PAGES.attendees />} />
							<Route path="/attendees/:id" element={<PAGES.attendees />} />
							<Route path="/checkin" element={<PAGES.checkin />} />
							<Route path="/checkin/:id" element={<PAGES.checkin />} />
							<Route path="/accommodation" element={<PAGES.accommodation />} />
							<Route path="/accommodation/:id" element={<PAGES.accommodation />} />
							<Route path="/travel" element={<PAGES.travel />} />
							<Route path="/travel/:id" element={<PAGES.travel />} />
							<Route path="/feedback" element={<PAGES.feedback />} />
							<Route path="/feedback/:id" element={<PAGES.feedback />} />
							<Route path="/food" element={<PAGES.food />} />
							<Route path="/food/:day" element={<PAGES.food />} />
							<Route path="/schedule" element={<PAGES.schedule />} />
							<Route path="/schedule/:day" element={<PAGES.schedule />} />
							<Route path="/vip" element={<PAGES.vip />} />
							<Route path="/vip/:id" element={<PAGES.vip />} />
							<Route path="/logistics" element={<PAGES.logistics />} />
							<Route path="/logistics/:id" element={<PAGES.logistics />} />
							<Route path="/venue" element={<PAGES.venue />} />
							<Route path="/venue/:id" element={<PAGES.venue />} />
							<Route path="/volunteers" element={<PAGES.volunteers />} />
							<Route path="/volunteers/:id" element={<PAGES.volunteers />} />
							<Route path="/helpdesk" element={<PAGES.helpdesk />} />
							<Route path="/helpdesk/:id" element={<PAGES.helpdesk />} />
							<Route path="/finance" element={<PAGES.finance />} />
							<Route path="/finance/:id" element={<PAGES.finance />} />
							<Route path="/reports" element={<PAGES.reports />} />
							<Route path="/settings" element={<PAGES.settings />} />
						</Routes>
					</Suspense>
					<div className="h-8" />
				</div>
			</div>
		</div>
	);
}
