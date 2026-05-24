import { type ReactNode } from "react";

import { hasAtLeastRole, useConference, type Membership } from "@/lib/ConferenceContext";
import { cx } from "@/lib/uiStyles";
import { Link, useRouter } from "@tanstack/react-router";
import {
	Award,
	BedDouble,
	Box,
	CalendarDays,
	ClipboardList,
	Crown,
	FileBarChart2,
	LayoutDashboard,
	LifeBuoy,
	Megaphone,
	Plane,
	Radio,
	ScrollText,
	Settings,
	Sliders,
	Upload,
	UserCog,
	Users,
	Utensils,
	Wallet,
} from "lucide-react";

type NavItem = {
	to: string;
	label: string;
	icon: ReactNode;
	min?: Membership["role"];
};

type NavSection = { label: string; items: NavItem[] };

function buildNav(slug: string): NavSection[] {
	const base = `/c/${slug}`;
	return [
		{
			label: "Overview",
			items: [
				{ to: `${base}`, label: "Dashboard", icon: <LayoutDashboard size={16} /> },
				{ to: `${base}/control-room`, label: "Control Room", icon: <Radio size={16} /> },
			],
		},
		{
			label: "People",
			items: [
				{ to: `${base}/attendees`, label: "Attendees", icon: <Users size={16} /> },
				{ to: `${base}/staff`, label: "Staff & Committees", icon: <UserCog size={16} /> },
				{ to: `${base}/vip`, label: "VIP Guests", icon: <Crown size={16} /> },
			],
		},
		{
			label: "Operations",
			items: [
				{ to: `${base}/travel`, label: "Travel & Vehicles", icon: <Plane size={16} /> },
				{
					to: `${base}/accommodation`,
					label: "Accommodation",
					icon: <BedDouble size={16} />,
				},
				{ to: `${base}/food`, label: "Food & Dining", icon: <Utensils size={16} /> },
				{ to: `${base}/programme`, label: "Programme", icon: <CalendarDays size={16} /> },
				{ to: `${base}/helpdesk`, label: "Helpdesk", icon: <LifeBuoy size={16} /> },
				{
					to: `${base}/announcements`,
					label: "Announcements",
					icon: <Megaphone size={16} />,
				},
				{ to: `${base}/certificates`, label: "Certificates", icon: <Award size={16} /> },
				{ to: `${base}/feedback`, label: "Feedback", icon: <ClipboardList size={16} /> },
				{ to: `${base}/logistics`, label: "Logistics", icon: <Box size={16} /> },
			],
		},
		{
			label: "Communications",
			items: [
				{ to: `${base}/comms`, label: "Messaging Studio", icon: <Megaphone size={16} /> },
			],
		},
		{
			label: "Data",
			items: [
				{
					to: `${base}/imports`,
					label: "Imports",
					icon: <Upload size={16} />,
					min: "editor",
				},
				{ to: `${base}/reports`, label: "Reports", icon: <FileBarChart2 size={16} /> },
				{
					to: `${base}/finance`,
					label: "Finance & Sponsors",
					icon: <Wallet size={16} />,
					min: "editor",
				},
			],
		},
		{
			label: "Admin",
			items: [
				{
					to: `${base}/members`,
					label: "Members",
					icon: <UserCog size={16} />,
					min: "admin",
				},
				{
					to: `${base}/custom-fields`,
					label: "Custom Fields",
					icon: <Sliders size={16} />,
					min: "admin",
				},
				{
					to: `${base}/audit`,
					label: "Audit Log",
					icon: <ScrollText size={16} />,
					min: "admin",
				},
				{
					to: `${base}/settings`,
					label: "Settings",
					icon: <Settings size={16} />,
					min: "admin",
				},
			],
		},
	];
}

export function Sidebar() {
	const { conference, membership } = useConference();
	const router = useRouter();
	const currentPath = router.state.location.pathname;
	const sections = buildNav(conference.slug);

	return (
		<aside className="w-60 shrink-0 border-r border-line bg-surface-2 flex flex-col h-full">
			<div className="px-4 py-2 border-b border-line">
				<div className="mt-1 text-sm font-semibold text-ink leading-tight">
					{conference.name}
				</div>
				<div className="mt-0.5 text-xs text-ink-3 truncate">{conference.shortName}</div>
			</div>

			<nav className="flex-1 overflow-y-auto px-2 py-3 space-y-3">
				{sections.map(sec => {
					const items = sec.items.filter(
						i => !i.min || hasAtLeastRole(membership, i.min),
					);
					if (!items.length) return null;
					return (
						<div key={sec.label}>
							<div className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-ink-3">
								{sec.label}
							</div>
							<div className="flex flex-col gap-0.5">
								{items.map(i => {
									const active =
										i.to === `/c/${conference.slug}`
											? currentPath === i.to
											: currentPath.startsWith(i.to);
									return (
										<Link
											key={i.to}
											to={i.to}
											className={cx(
												"flex items-center gap-2.5 px-2.5 h-8 rounded-md text-[13px] transition-colors",
												active
													? "bg-accent-soft text-accent-soft-fg font-medium"
													: "text-ink-2 hover:bg-surface-3 hover:text-ink",
											)}
										>
											{i.icon}
											<span className="truncate">{i.label}</span>
										</Link>
									);
								})}
							</div>
						</div>
					);
				})}
			</nav>
		</aside>
	);
}
