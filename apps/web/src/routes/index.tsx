import { api } from "@/lib/api";
import { humanise } from "@/lib/format";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Plus } from "lucide-react";



import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";





type Me = {
	user: { id: string; name: string; email: string; isPlatformAdmin?: boolean };
	memberships: {
		conferenceId: string;
		conferenceSlug: string;
		conferenceName: string;
		conferenceShortName: string;
		conferenceStatus: string;
		role: string;
		isActive: boolean;
		startDate?: string;
		endDate?: string;
	}[];
};

export const Route = createFileRoute("/")({
	component: IndexPage,
});

function IndexPage() {
	const navigate = useNavigate();
	const { data, isLoading, error } = useQuery<Me>({
		queryKey: ["me"],
		queryFn: () => api.get<Me>("/api/v1/auth/me"),
		retry: false,
	});

	return isLoading ? (
		<CenterSpinner />
	) : data && !data?.user ? (
		<div className="min-h-screen flex items-center justify-center px-6">
			<div className="w-full max-w-2xl text-center">
				<div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-ink-3">
					Conference Dashboard
				</div>
				<h1 className="mt-4 text-4xl sm:text-5xl font-semibold text-ink leading-tight">
					Welcome to Conference Dashboard
				</h1>
				<div className="mt-8 flex items-center justify-center">
					<Button variant="primary" size="lg" onClick={() => navigate({ to: "/login" })}>
						Sign in
					</Button>
				</div>
			</div>
		</div>
	) : error ? (
		<div className="flex flex-col h-screen">
			<AppHeader />
			<main className="flex-1 overflow-y-auto px-6 py-8">
				<div className="max-w-3xl mx-auto">
					<Card>
						<EmptyState
							title="Could not load conferences"
							hint={error instanceof Error ? error.message : String(error)}
						/>
					</Card>
				</div>
			</main>
		</div>
	) : (
		<div className="flex flex-col h-screen">
			<AppHeader />
			<main className="flex-1 overflow-y-auto px-6 py-8">
				<div className="max-w-3xl mx-auto">
					<div className="flex items-baseline justify-between mb-5">
						<h1 className="text-2xl font-semibold text-ink leading-tight">
							Your conferences
						</h1>
						{data?.user?.isPlatformAdmin && (
							<Button
								variant="primary"
								leadingIcon={<Plus size={14} />}
								onClick={() => navigate({ to: "/new-conference" })}
							>
								New conference
							</Button>
						)}
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						{(data?.memberships ?? [])
							.filter(m => m.isActive)
							.map(m => (
								<Link
									key={m.conferenceId}
									to={`/c/${m.conferenceSlug}`}
									className="group block bg-surface border border-line rounded-lg shadow-card p-4 hover:border-accent transition-colors"
								>
									<div className="flex items-start justify-between gap-2">
										<div className="min-w-0">
											<div className="text-[10px] font-semibold uppercase tracking-wider text-ink-3 flex items-center">
												{m.conferenceShortName}
												<Badge
													className="ml-2"
													size="xs"
													variant={
														m.conferenceStatus === "active"
															? "success"
															: "neutral"
													}
												>
													{humanise(m.conferenceStatus)}
												</Badge>
											</div>
											<div className="mt-1 text-base font-semibold text-ink leading-tight">
												{m.conferenceName}
											</div>
											{(m.startDate || m.endDate) && (
												<div className="mt-1 text-xs text-ink-3">
													{m.startDate
														? new Date(m.startDate).toLocaleDateString(
																undefined,
																{
																	day: "numeric",
																	month: "short",
																	year: "numeric",
																},
															)
														: "Ongoing"}{" "}
													-{" "}
													{m.endDate
														? new Date(m.endDate).toLocaleDateString(
																undefined,
																{
																	day: "numeric",
																	month: "short",
																	year: "numeric",
																},
															)
														: "Ongoing"}
												</div>
											)}
										</div>
										<ArrowRight
											size={16}
											className="text-ink-3 group-hover:text-accent group-hover:translate-x-0.5 transition-all"
										/>
									</div>
									<div className="mt-3">
										<Badge variant="accent">{humanise(m.role)}</Badge>
									</div>
								</Link>
							))}
						{!data?.memberships?.length && (
							<div className="col-span-full">
								<Card>
									<EmptyState
										title="You don't belong to any conference yet"
										hint={
											data?.user?.isPlatformAdmin
												? "Create a conference to get started."
												: "Ask an administrator to invite you."
										}
									/>
								</Card>
							</div>
						)}
					</div>
				</div>
			</main>
		</div>
	);
}
