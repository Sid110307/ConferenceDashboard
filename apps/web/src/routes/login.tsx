import { useState } from "react";

import { authClient } from "@/lib/auth-client";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Google } from "iconoir-react";
import { z } from "zod";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FieldRow } from "@/components/FieldRow";
import { Input } from "@/components/Input";
import { useToast } from "@/components/Toast";

const SearchSchema = z.object({ next: z.string().optional() });

export const Route = createFileRoute("/login")({
	validateSearch: s => SearchSchema.parse(s),
	component: LoginPage,
});

function LoginPage() {
	const navigate = useNavigate();
	const search = Route.useSearch();
	const toast = useToast();
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [loading, setLoading] = useState<"none" | "email" | "google">("none");
	const next = search.next?.startsWith("/") ? search.next : "/";

	const onEmailSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (loading !== "none") return;
		if (!email || !password) {
			toast.error("Please enter your email and password.");
			return;
		}

		setLoading("email");
		try {
			const r = await authClient.signIn.email({ email, password });
			if (r.error) {
				toast.error("Sign-in failed", r.error.message);
				return;
			}
			navigate({ to: next }).catch(console.error);
		} catch (err: any) {
			toast.error("Sign-in failed", err?.message ?? "Check your credentials and try again.");
		} finally {
			setLoading("none");
		}
	};

	const onGoogle = async () => {
		setLoading("google");
		try {
			await authClient.signIn.social({
				provider: "google",
				callbackURL: next,
			});
		} catch (err: any) {
			toast.error("Google sign-in failed", err?.message);
			setLoading("none");
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center px-4">
			<div className="w-full max-w-md">
				<div className="text-center mb-6">
					<div className="text-2xl font-semibold text-ink">Conference Dashboard</div>
					<div className="mt-1 text-sm text-ink-2">Sign in to continue</div>
				</div>
				<Card pad="lg">
					<form onSubmit={onEmailSubmit} className="flex flex-col gap-4">
						<FieldRow label="Email" htmlFor="email">
							<Input
								id="email"
								type="email"
								autoComplete="email"
								autoFocus
								required
								value={email}
								onChange={e => setEmail(e.target.value)}
							/>
						</FieldRow>
						<FieldRow label="Password" htmlFor="password">
							<Input
								id="password"
								type="password"
								autoComplete="current-password"
								required
								value={password}
								onChange={e => setPassword(e.target.value)}
							/>
						</FieldRow>
						<Button
							type="submit"
							variant="primary"
							size="lg"
							loading={loading === "email"}
						>
							Sign in
						</Button>
					</form>
					<div className="my-4 flex items-center gap-3 text-xs text-ink-3">
						<div className="h-px bg-line flex-1" />
						<span>or</span>
						<div className="h-px bg-line flex-1" />
					</div>
					<Button
						variant="secondary"
						size="lg"
						className="w-full"
						onClick={onGoogle}
						loading={loading === "google"}
					>
						{loading !== "google" && <Google className="inline" />}
						Continue with Google
					</Button>
				</Card>
			</div>
		</div>
	);
}
