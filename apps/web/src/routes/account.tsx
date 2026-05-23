import { useEffect, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import { initials } from "@/lib/format";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, KeyRound, LogOut } from "lucide-react";

import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CenterSpinner } from "@/components/EmptyState";
import { FieldRow } from "@/components/FieldRow";
import { Input } from "@/components/Input";
import { useToast } from "@/components/Toast";

type Me = {
	user: {
		id: string;
		name: string;
		email: string;
		image?: string | null;
		isPlatformAdmin?: boolean;
		hasPassword?: boolean;
	};
	memberships: { conferenceName: string; role: string; isActive: boolean }[];
};

export const Route = createFileRoute("/account")({
	beforeLoad: async ({ location }) => {
		try {
			await api.get<Me>("/api/v1/auth/me");
		} catch (err) {
			if (err instanceof ApiError && err.status === 401) {
				throw redirect({
					to: "/login",
					search: { next: `${location.pathname}${location.search}${location.hash}` },
				});
			}
			throw err;
		}
	},
	component: AccountPage,
});

function AccountPage() {
	const navigate = useNavigate();
	const qc = useQueryClient();
	const toast = useToast();

	const me = useQuery<Me>({
		queryKey: ["me"],
		queryFn: () => api.get<Me>("/api/v1/auth/me"),
	});

	const [name, setName] = useState("");
	const [pw, setPw] = useState({ current: "", next: "", confirm: "" });

	useEffect(() => {
		if (me.data?.user.name && name === "") {
			setName(me.data.user.name);
		}
	}, [me.data?.user.name, name]);

	const saveProfile = useMutation({
		mutationFn: () => api.patch("/api/v1/auth/me", { name }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["me"] });
			toast.success("Profile updated");
		},
		onError: (e: any) => toast.error("Update failed", e.message),
	});

	const changePassword = useMutation({
		mutationFn: async () => {
			if (pw.next !== pw.confirm) throw new Error("New passwords do not match");
			if (pw.next.length < 8) throw new Error("New password must be at least 8 characters");

			if (me.data?.user.hasPassword === false) {
				await api.post("/api/v1/auth/password", {
					newPassword: pw.next,
				});
				return;
			}

			await authClient.changePassword({
				currentPassword: pw.current,
				newPassword: pw.next,
			});
		},
		onSuccess: () => {
			setPw({ current: "", next: "", confirm: "" });
			qc.invalidateQueries({ queryKey: ["me"] }).catch(console.error);
			toast.success(
				me.data?.user.hasPassword === false ? "Password added" : "Password changed",
				"Your password has been successfully updated.",
			);
		},
		onError: (e: any) =>
			toast.error(
				me.data?.user.hasPassword === false
					? "Could not add password"
					: "Could not change password",
				e.error?.message ?? e.message,
			),
	});

	const signOut = async () => {
		try {
			await authClient.signOut();
			toast.success("Successfully logged out");

			await navigate({ to: "/login" });
		} catch (e: any) {
			toast.error("Logout failed", e.error?.message ?? "Please try again.");
		}
	};

	return me.isLoading || !me.data ? (
		<div className="min-h-full">
			<AppHeader />
			<div className="py-20">
				<CenterSpinner label="Loading account..." />
			</div>
		</div>
	) : (
		<div className="min-h-full">
			<AppHeader />
			<div className="max-w-2xl mx-auto px-6 py-8">
				<Button
					variant="ghost"
					leadingIcon={<ArrowLeft size={14} />}
					onClick={() => navigate({ to: ".." })}
					className="mb-4"
				>
					Back
				</Button>
				<div className="flex items-center gap-4 mb-6">
					{me.data.user.image ? (
						<img src={me.data.user.image} alt="" className="size-14 rounded-full" />
					) : (
						<div className="size-14 rounded-full bg-accent-soft text-accent-soft-fg flex items-center justify-center text-lg font-semibold">
							{initials(me.data.user.name)}
						</div>
					)}
					<div>
						<div className="flex items-center gap-2">
							<h1 className="text-xl font-semibold text-ink">{me.data.user.name}</h1>
							{me.data.user.isPlatformAdmin && (
								<Badge variant="accent">Platform admin</Badge>
							)}
						</div>
						<p className="text-sm text-ink-3">{me.data.user.email}</p>
					</div>
				</div>
				<Card title="Profile" subtitle="Your display name across all conferences">
					<div className="space-y-4">
						<FieldRow label="Display name">
							<Input value={name} onChange={e => setName(e.target.value)} />
						</FieldRow>
						<FieldRow label="Email" hint="Email cannot be changed.">
							<Input value={me.data.user.email} disabled />
						</FieldRow>
						<div className="flex justify-end">
							<Button
								variant="primary"
								loading={saveProfile.isPending}
								disabled={!name || name === me.data.user.name}
								onClick={() => saveProfile.mutate()}
							>
								Save profile
							</Button>
						</div>
					</div>
				</Card>
				<div className="mt-4">
					<Card
						title={me.data.user.hasPassword === false ? "Add password" : "Password"}
						subtitle={
							me.data.user.hasPassword === false
								? "Create a password so you can also sign in with email and password"
								: "Change the password for email sign-in"
						}
					>
						<div className="space-y-4">
							{me.data.user.hasPassword !== false && (
								<FieldRow label="Current password">
									<Input
										type="password"
										value={pw.current}
										onChange={e =>
											setPw(p => ({ ...p, current: e.target.value }))
										}
									/>
								</FieldRow>
							)}
							<div className="grid grid-cols-2 gap-3">
								<FieldRow label="New password">
									<Input
										type="password"
										value={pw.next}
										onChange={e => setPw(p => ({ ...p, next: e.target.value }))}
									/>
								</FieldRow>
								<FieldRow label="Confirm new password">
									<Input
										type="password"
										value={pw.confirm}
										onChange={e =>
											setPw(p => ({ ...p, confirm: e.target.value }))
										}
									/>
								</FieldRow>
							</div>
							<div className="flex justify-end">
								<Button
									variant="secondary"
									leadingIcon={<KeyRound size={13} />}
									loading={changePassword.isPending}
									disabled={
										me.data.user.hasPassword === false
											? !pw.next || !pw.confirm
											: !pw.current || !pw.next || !pw.confirm
									}
									onClick={() => changePassword.mutate()}
								>
									{me.data.user.hasPassword === false
										? "Add password"
										: "Change password"}
								</Button>
							</div>
						</div>
					</Card>
				</div>
				<div className="mt-4">
					<Card
						title="Conference access"
						subtitle="List of conferences you have access to"
					>
						<div className="space-y-1.5">
							{me.data.memberships.map((m, i) => (
								<div
									key={i}
									className="flex items-center justify-between rounded-md border border-line px-3 py-2"
								>
									<span className="text-sm text-ink">{m.conferenceName}</span>
									<div className="flex items-center gap-2">
										<Badge variant="neutral" size="sm" className="capitalize">
											{m.role.replace(/_/g, " ")}
										</Badge>
										{!m.isActive && (
											<Badge variant="warn" size="sm">
												Inactive
											</Badge>
										)}
									</div>
								</div>
							))}
							{me.data.memberships.length === 0 && (
								<div className="text-sm text-ink-3">
									You are not a member of any conferences yet.
								</div>
							)}
						</div>
					</Card>
				</div>
				<div className="mt-6 flex justify-end">
					<Button variant="danger" leadingIcon={<LogOut size={14} />} onClick={signOut}>
						Sign out
					</Button>
				</div>
			</div>
		</div>
	);
}
