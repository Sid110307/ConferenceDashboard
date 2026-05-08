import React from "react";

const PAGE_IMPORTS: Record<string, React.LazyExoticComponent<any>> = {
	dashboard: React.lazy(() =>
		import("@/pages/DashboardPage").then(m => ({ default: m.DashboardPage })),
	),
	attendees: React.lazy(() =>
		import("@/pages/AttendeesPage").then(m => ({ default: m.AttendeesPage })),
	),
	checkin: React.lazy(() =>
		import("@/pages/CheckInPage").then(m => ({ default: m.CheckInPage })),
	),
	feedback: React.lazy(() =>
		import("@/pages/FeedbackPage").then(m => ({ default: m.FeedbackPage })),
	),
	travel: React.lazy(() => import("@/pages/TravelPage").then(m => ({ default: m.TravelPage }))),
	accommodation: React.lazy(() =>
		import("@/pages/AccommodationPage").then(m => ({ default: m.AccommodationPage })),
	),
	food: React.lazy(() => import("@/pages/FoodPage").then(m => ({ default: m.FoodPage }))),
	schedule: React.lazy(() =>
		import("@/pages/SchedulePage").then(m => ({ default: m.SchedulePage })),
	),
	vip: React.lazy(() => import("@/pages/VIPPage").then(m => ({ default: m.VIPPage }))),
	logistics: React.lazy(() =>
		import("@/pages/LogisticsPage").then(m => ({ default: m.LogisticsPage })),
	),
	venue: React.lazy(() => import("@/pages/VenuePage").then(m => ({ default: m.VenuePage }))),
	volunteers: React.lazy(() =>
		import("@/pages/VolunteersPage").then(m => ({ default: m.VolunteersPage })),
	),
	helpdesk: React.lazy(() =>
		import("@/pages/HelpdeskPage").then(m => ({ default: m.HelpdeskPage })),
	),
	finance: React.lazy(() =>
		import("@/pages/FinancePage").then(m => ({ default: m.FinancePage })),
	),
	reports: React.lazy(() =>
		import("@/pages/ReportsPage").then(m => ({ default: m.ReportsPage })),
	),
	settings: React.lazy(() =>
		import("@/pages/SettingsPage").then(m => ({ default: m.SettingsPage })),
	),
};

type PageLoader = React.LazyExoticComponent<any> | (() => Promise<{ default: any }>);

const registry: Record<string, PageLoader> = { ...PAGE_IMPORTS };

export const registerPage = (id: string, loader: PageLoader) => {
	registry[id] = loader;
};

export const unregisterPage = (id: string) => {
	delete registry[id];
};

export const getRegisteredPages = () => ({ ...registry });

export default {
	registerPage,
	unregisterPage,
	getRegisteredPages,
};
