import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/c/")({
	beforeLoad: () => {
		throw redirect({ to: "/", replace: true });
	},
});
