import type { UserRole } from "@conference/shared";

export type AuthUser = {
	id: string;
	email: string;
	name: string | null;
	image: string | null;
	isPlatformAdmin: boolean;
};

export type ActiveConference = {
	id: string;
	slug: string;
	name: string;
	shortName: string | null;
};

export type ActiveMembership = {
	role: UserRole;
	isActive: boolean;
	permissions: Record<string, boolean>;
};

export type AppContext = {
	Variables: {
		requestId: string;
		user?: AuthUser;
		sessionId?: string;
		conference?: ActiveConference;
		membership?: ActiveMembership;
	};
};

export type { UserRole } from "@conference/shared";
