import { createContext, useContext, type ReactNode } from "react";

export type Membership = {
	role: "viewer" | "editor" | "admin" | "super_admin";
	isActive: boolean;
	permissions?: string[];
	userId?: string;
};

export type ActiveConference = {
	id: string;
	slug: string;
	name: string;
	shortName: string;
	venue?: string | null;
	city?: string | null;
	startDate?: string | null;
	endDate?: string | null;
	logoUrl?: string | null;
	theme?: {
		primaryColor?: string | null;
		secondaryColor?: string | null;
		accentColor?: string | null;
	} | null;
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

const ROLE_RANK = { viewer: 1, editor: 2, admin: 3, super_admin: 4 } as const;

export function hasRole(membership: Membership, minimum: Membership["role"]): boolean {
	return ROLE_RANK[membership.role] >= ROLE_RANK[minimum];
}
