import { createContext, useContext, type ReactNode } from "react";

import { hasAtLeastRole as sharedHasAtLeastRole, type UserRole } from "@conference/shared";

export type Membership = {
	role: "viewer" | "editor" | "admin" | "super_admin";
	isActive: boolean;
	permissions?: Record<string, any>;
	userId: string;
};

export type ActiveConference = {
	id: string;
	slug: string;
	name: string;
	shortName: string;
	description: string;
	publicStatus: "draft" | "published" | "archived";
	venueName?: string | null;
	venueAddress?: string | null;
	venueCity?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	logoFileId?: string | null;
};

type Ctx = {
	conference: ActiveConference;
	membership: Membership;
};

const ConferenceCtx = createContext<Ctx | null>(null);

export function ConferenceProvider({
	conference,
	membership,
	children,
}: {
	conference: ActiveConference;
	membership: Membership;
	children: ReactNode;
}) {
	return (
		<ConferenceCtx.Provider value={{ conference, membership }}>
			{children}
		</ConferenceCtx.Provider>
	);
}

export function useConference(): Ctx {
	const ctx = useContext(ConferenceCtx);
	if (!ctx) {
		throw new Error("useConference must be used inside a ConferenceProvider.");
	}
	return ctx;
}

export function hasAtLeastRole(membership: Membership, minimum: Membership["role"]): boolean {
	return sharedHasAtLeastRole(membership.role as UserRole, minimum as UserRole);
}
