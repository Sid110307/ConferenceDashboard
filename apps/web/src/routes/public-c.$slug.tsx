import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/public-c/$slug")({
	beforeLoad: ({ params }) => {
		throw redirect({ to: "/c/$slug", params: { slug: params.slug }, replace: true });
	},
});

void Route;
