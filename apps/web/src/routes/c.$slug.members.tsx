import { useState } from "react";

import { api } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { fmtRelative, humanise, initials } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import type { BadgeVariant } from "@/lib/uiStyles";
import {
	inviteUserSchema,
	USER_ROLES,
	type InviteUserInput,
	type UserRole,
} from "@conference/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, ShieldCheck, UserPlus, X } from "lucide-react";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useConfirm } from "@/components/ConfirmDialog";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

export const Route = createFileRoute("/c/$slug/members")({
	component: MembersPage,
});

type Member = {
	userId: string;
	name: string;
	email: string;
	role: string;
	isActive: boolean;
	lastSeenAt?: string | null;
	joinedAt: string;
};
type Invite = {
	id: string;
	email: string;
	role: string;
	invitedByName?: string | null;
	createdAt: string;
	expiresAt?: string | null;
};
type InviteData = {
	data: Invite;
	inviteUrl: string;
	token: string;
	enqueued?: boolean;
};

const ROLE_VARIANT: Record<UserRole, BadgeVariant> = {
	super_admin: "success",
	admin: "accent",
	editor: "info",
	viewer: "neutral",
};
const ASSIGNABLE_ROLES: UserRole[] = USER_ROLES.filter(r => r !== "super_admin");

function MembersPage() {
	const { conference, membership } = useConference();
	const canAdmin = hasAtLeastRole(membership, "admin");
	const isSuperAdmin = membership.role === "super_admin";
	const qc = useQueryClient();
	const toast = useToast();
	const confirm = useConfirm();

	const members = useQuery<{ data: Member[] }>({
		queryKey: queryKeys.members(conference.slug),
		queryFn: () => api.get<{ data: Member[] }>(`/api/v1/c/${conference.slug}/members`),
	});
	const invites = useQuery<{ data: Invite[] }>({
		queryKey: queryKeys.invites(conference.slug),
		queryFn: () => api.get<{ data: Invite[] }>(`/api/v1/c/${conference.slug}/members/invites`),
		enabled: canAdmin,
	});

	const [inviteOpen, setInviteOpen] = useState(false);

	const changeRole = useMutation({
		mutationFn: (input: { userId: string; role: string }) =>
			api.patch(`/api/v1/c/${conference.slug}/members/${input.userId}`, {
				role: input.role,
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.members(conference.slug) }).catch(
				console.error,
			);
			toast.success("Role updated");
		},
		onError: (e: any) => toast.error("Could not change role", e.message),
	});
	const deactivate = useMutation({
		mutationFn: (userId: string) => api.del(`/api/v1/c/${conference.slug}/members/${userId}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.members(conference.slug) }).catch(
				console.error,
			);
			toast.success("Member removed");
		},
		onError: (e: any) => toast.error("Could not remove member", e.message),
	});
	const revokeInvite = useMutation({
		mutationFn: (id: string) =>
			api.post(`/api/v1/c/${conference.slug}/members/invites/${id}/revoke`, {}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.invites(conference.slug) }).catch(
				console.error,
			);
			toast.success("Invite revoked");
		},
		onError: (e: any) => toast.error("Could not revoke", e.message),
	});

	const roleOptions = isSuperAdmin ? ["super_admin", ...ASSIGNABLE_ROLES] : ASSIGNABLE_ROLES;

	return (
		<div className="p-6">
			<PageHeader
				title="Team & Access"
				description="Manage who can access this conference and what they can do."
				actions={
					canAdmin && (
						<Button
							variant="primary"
							leadingIcon={<UserPlus size={14} />}
							onClick={() => setInviteOpen(true)}
						>
							Invite member
						</Button>
					)
				}
			/>
			<Card
				title="Members"
				subtitle={`${members.data?.data.length ?? 0} with access`}
				pad="sm"
			>
				{members.isLoading && <CenterSpinner />}
				<div className="divide-y divide-line">
					{(members.data?.data ?? []).map(m => (
						<div key={m.userId} className="flex items-center gap-3 py-3">
							<div className="size-9 rounded-full bg-accent-soft text-accent-soft-fg flex items-center justify-center text-xs font-semibold shrink-0">
								{initials(m.name)}
							</div>
							<div className="min-w-0 flex-1">
								<div className="flex items-center gap-2">
									<span className="text-sm font-medium text-ink truncate">
										{m.name}
									</span>
									{!m.isActive && (
										<Badge size="xs" variant="neutral">
											Inactive
										</Badge>
									)}
								</div>
								<div className="text-xs text-ink-3 truncate">{m.email}</div>
							</div>
							<div className="text-xs text-ink-3 hidden sm:block">
								{m.lastSeenAt
									? `Active ${fmtRelative(m.lastSeenAt)}`
									: "Never signed in"}
							</div>
							{canAdmin && m.role !== "super_admin" ? (
								<Select
									value={m.role}
									onChange={e =>
										changeRole.mutate({
											userId: m.userId,
											role: e.target.value,
										})
									}
									className="w-32"
								>
									{roleOptions.map(r => (
										<option key={r} value={r}>
											{humanise(r)}
										</option>
									))}
								</Select>
							) : (
								<Badge
									variant={
										ROLE_VARIANT[m.role as keyof typeof ROLE_VARIANT] ??
										"neutral"
									}
								>
									{humanise(m.role)}
								</Badge>
							)}
							{canAdmin &&
								m.role !== "super_admin" &&
								m.userId !== membership.userId && (
									<Button
										variant="ghost"
										size="xs"
										leadingIcon={<X size={12} />}
										onClick={async () => {
											const ok = await confirm({
												title: `Remove ${m.name}?`,
												description:
													"They will lose access to this conference.",
												tone: "danger",
												confirmLabel: "Remove",
											});
											if (ok) deactivate.mutate(m.userId);
										}}
									>
										Remove
									</Button>
								)}
						</div>
					))}
				</div>
			</Card>
			{canAdmin && (
				<div className="mt-4">
					<Card title="Pending invitations" pad="sm">
						{invites.isLoading && <CenterSpinner />}
						{!invites.isLoading && invites.data?.data?.length === 0 && (
							<EmptyState title="No pending invitations" />
						)}
						<div className="divide-y divide-line">
							{(invites.data?.data ?? []).map(inv => (
								<div key={inv.id} className="flex items-center gap-3 py-3">
									<Mail size={16} className="text-ink-3 shrink-0" />
									<div className="min-w-0 flex-1">
										<div className="text-sm text-ink truncate">{inv.email}</div>
										<div className="text-xs text-ink-3">
											Invited {fmtRelative(inv.createdAt)}
											{inv.invitedByName && ` by ${inv.invitedByName}`}
										</div>
									</div>
									<Badge
										variant={
											ROLE_VARIANT[inv.role as keyof typeof ROLE_VARIANT] ??
											"neutral"
										}
									>
										{humanise(inv.role)}
									</Badge>
									<Button
										variant="ghost"
										size="xs"
										onClick={() => revokeInvite.mutate(inv.id)}
									>
										Revoke
									</Button>
								</div>
							))}
						</div>
					</Card>
				</div>
			)}

			{inviteOpen && (
				<InviteDrawer roleOptions={ASSIGNABLE_ROLES} onClose={() => setInviteOpen(false)} />
			)}
		</div>
	);
}

function InviteDrawer({ roleOptions, onClose }: { roleOptions: UserRole[]; onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const [email, setEmail] = useState("");
	const [role, setRole] = useState<UserRole>("viewer");
	const providers = useQuery<{ data: { id: string; channel: string; isDefault: boolean }[] }>({
		queryKey: queryKeys.providers(conference.slug),
		queryFn: () => api.get<{ data: any[] }>(`/api/v1/c/${conference.slug}/comms/providers`),
		staleTime: 60000,
	});
	const [inviteData, setInviteData] = useState<InviteData | null>(null);

	const invite = useMutation({
		mutationFn: () =>
			api.post(
				`/api/v1/c/${conference.slug}/members/invite`,
				inviteUserSchema.parse({
					email,
					role,
					send:
						providers.data?.data?.some(p => p.channel === "email" && p.isDefault) ??
						false,
				}) as InviteUserInput & { send?: boolean },
			),
		onSuccess: (data: any) => {
			qc.invalidateQueries({ queryKey: queryKeys.invites(conference.slug) }).catch(
				console.error,
			);
			setInviteData(data as InviteData & { enqueued?: boolean });
		},
		onError: (e: any) => toast.error("Could not send invite", e.message),
	});

	const sendViaSystem = useMutation({
		mutationFn: (payload: { id: string; token: string }) =>
			api.post(`/api/v1/c/${conference.slug}/members/invite/${payload.id}/send`, {
				token: payload.token,
			}),
		onSuccess: () => {
			toast.success("Invitation sent", `${email} will receive an email shortly.`);
			qc.invalidateQueries({ queryKey: queryKeys.invites(conference.slug) }).catch(
				console.error,
			);
		},
		onError: (e: any) => toast.error("Could not send invite", e.message),
	});

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title="Invite a team member"
			width="sm"
			footer={
				<>
					{inviteData ? (
						<>
							<Button
								variant="ghost"
								onClick={() => {
									setInviteData(null);
									onClose();
								}}
							>
								Close
							</Button>
							<Button
								variant="primary"
								onClick={() => {
									navigator.clipboard
										?.writeText(inviteData.inviteUrl ?? "")
										.then(() => {
											toast.success("Copied to clipboard");
										})
										.catch(() => toast.error("Could not copy"));
								}}
							>
								Copy link
							</Button>
							{!inviteData.enqueued &&
							providers.data?.data?.some(
								p => p.channel === "email" && p.isDefault,
							) ? (
								<Button
									variant="secondary"
									onClick={() => {
										sendViaSystem.mutate({
											id: inviteData.data.id,
											token: inviteData.token,
										});
									}}
								>
									Send
								</Button>
							) : null}
						</>
					) : (
						<>
							<Button variant="ghost" onClick={onClose}>
								Cancel
							</Button>
							<Button
								variant="primary"
								loading={invite.isPending}
								disabled={!email}
								leadingIcon={<Mail size={13} />}
								onClick={() => invite.mutate()}
							>
								Send invite
							</Button>
						</>
					)}
				</>
			}
		>
			{inviteData ? (
				<div className="space-y-4">
					<FieldRow label="Invitation link">
						<div className="flex items-center gap-2">
							<input
								readOnly
								value={inviteData.inviteUrl}
								className="flex-1 text-xs p-2 bg-surface border border-line rounded"
							/>
							<Button
								variant="icon"
								onClick={() =>
									navigator.clipboard
										?.writeText(inviteData.inviteUrl ?? "")
										.then(() => toast.success("Copied"))
								}
								leadingIcon={<Mail size={13} />}
							/>
							<a
								href={`mailto:${inviteData.data.email}?subject=${encodeURIComponent("You're invited to join")}&body=${encodeURIComponent(`Join using this link: ${inviteData.inviteUrl}`)}`}
								className="inline-block"
							>
								<Button variant="secondary">Send email</Button>
							</a>
						</div>
					</FieldRow>
				</div>
			) : (
				<div className="space-y-4">
					<FieldRow label="Email address" required>
						<Input
							type="email"
							value={email}
							onChange={e => setEmail(e.target.value)}
							placeholder="colleague@example.org"
						/>
					</FieldRow>
					<FieldRow label="Role">
						<Select value={role} onChange={e => setRole(e.target.value as UserRole)}>
							{roleOptions.map(r => (
								<option key={r} value={r}>
									{humanise(r)}
								</option>
							))}
						</Select>
					</FieldRow>
					<div className="rounded-md bg-surface-2 border border-line p-3 text-xs text-ink-2 space-y-1">
						<div className="flex items-center gap-1.5 font-medium text-ink">
							<ShieldCheck size={13} /> Role capabilities
						</div>
						<div>
							<b>Admin</b>: full access incl. members & settings.
						</div>
						<div>
							<b>Editor</b>: create and edit records, run imports & campaigns.
						</div>
						<div>
							<b>Viewer</b>: read-only access to all data.
						</div>
					</div>
				</div>
			)}
		</EntityDrawer>
	);
}
