import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { queryKeys } from "@/lib/queryKeys";
import { btn, cx } from "@/lib/uiStyles";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "@tanstack/react-router";
import { ArrowLeftRight, ChevronDown, LogOut, User } from "lucide-react";

import { useToast } from "@/components/Toast";

type Me = {
	user: { id: string; name: string; email: string; image?: string | null };
	memberships?: { conferenceId: string; role: string }[];
};

export function AppHeader({ rightSlot }: { rightSlot?: React.ReactNode }) {
	const location = useLocation();
	const toast = useToast();
	const { data } = useQuery<Me>({
		queryKey: queryKeys.me(),
		queryFn: () => api.get<Me>("/api/v1/auth/me"),
		staleTime: 5 * 60000,
	});
	const user = data?.user;

	const initials = data?.user?.name
		? data.user.name
				.split(/\s+/)
				.filter(Boolean)
				.slice(0, 2)
				.map(n => n[0]!.toUpperCase())
				.join("")
		: "?";
	const showSwitchConference =
		user && data?.memberships && data.memberships.length > 0 && location.pathname !== "/";

	return (
		<header className="h-12 shrink-0 border-b border-line bg-surface px-4 flex items-center justify-between gap-3">
			<div className="flex items-center gap-2 min-w-0">
				<Link
					to="/"
					className="text-sm font-semibold text-ink hover:text-accent transition-colors"
				>
					Conference Dashboard
				</Link>
			</div>
			<div className="flex items-center gap-2">
				{rightSlot}
				{user ? (
					<DropdownMenu.Root>
						<DropdownMenu.Trigger
							className={cx(btn.ghost, "h-8 px-2 gap-2")}
							aria-label="Account menu"
						>
							{user.image ? (
								<img
									src={user.image}
									alt={user.name}
									className="size-6 rounded-full object-cover bg-ink-100"
								/>
							) : (
								<div className="size-6 rounded-full bg-accent-soft text-accent-soft-fg text-[10px] font-semibold inline-flex items-center justify-center">
									{initials}
								</div>
							)}
							<span className="text-xs text-ink-2 hidden sm:inline truncate max-w-[140px]">
								{user.email}
							</span>
							<ChevronDown size={14} className="text-ink-3" />
						</DropdownMenu.Trigger>
						<DropdownMenu.Portal>
							<DropdownMenu.Content
								align="end"
								sideOffset={4}
								className="z-50 bg-surface border border-line rounded-md shadow-pop py-1 min-w-[200px]"
							>
								<div className="px-3 py-2 border-b border-line flex items-center gap-2">
									{user.image && (
										<div className="size-8 rounded-full bg-ink-100 flex-shrink-0">
											<img
												src={user.image}
												alt={user.name}
												className="size-full rounded-full object-cover"
											/>
										</div>
									)}
									<div className="min-w-0">
										<div className="text-sm font-medium text-ink truncate">
											{user.name}
										</div>
										<div className="text-xs text-ink-3 truncate">
											{user.email}
										</div>
									</div>
								</div>
								{showSwitchConference && (
									<DropdownMenu.Item asChild>
										<Link
											to="/"
											className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink cursor-pointer outline-none"
										>
											<ArrowLeftRight size={14} /> Switch conference
										</Link>
									</DropdownMenu.Item>
								)}
								<DropdownMenu.Item asChild>
									<Link
										to="/account"
										className="flex items-center gap-2 px-3 py-1.5 text-sm text-ink-2 hover:bg-surface-2 hover:text-ink cursor-pointer outline-none"
									>
										<User size={14} /> Account
									</Link>
								</DropdownMenu.Item>
								<DropdownMenu.Item
									className="flex items-center gap-2 px-3 py-1.5 text-sm text-danger-soft-fg hover:bg-danger-soft cursor-pointer outline-none"
									onSelect={async () => {
										try {
											await authClient.signOut();
											toast.success("Successfully logged out");

											window.location.href = "/login";
										} catch (err: any) {
											toast.error(
												"Logout failed",
												err?.message ?? "Please try again.",
											);
										}
									}}
								>
									<LogOut size={14} /> Sign out
								</DropdownMenu.Item>
							</DropdownMenu.Content>
						</DropdownMenu.Portal>
					</DropdownMenu.Root>
				) : (
					<Link to="/login" className={cx(btn.secondary, "h-8 px-3 text-xs font-medium")}>
						Sign in
					</Link>
				)}
			</div>
		</header>
	);
}
