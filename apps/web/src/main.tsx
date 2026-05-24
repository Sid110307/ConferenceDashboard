import React from "react";
import ReactDOM from "react-dom/client";

import { routeTree } from "@/routeTree.gen";
import { createRouter, RouterProvider } from "@tanstack/react-router";

import "@/styles.css";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Pending } from "@/components/Pending";

const router = createRouter({
	routeTree,
	defaultPreload: "intent",
	defaultPreloadStaleTime: 0,
	defaultErrorComponent: ErrorBoundary,
	defaultPendingComponent: Pending,
	defaultPendingMs: 250,
});

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("root element not found");

ReactDOM.createRoot(rootEl).render(
	<React.StrictMode>
		<RouterProvider router={router} />
	</React.StrictMode>,
);
