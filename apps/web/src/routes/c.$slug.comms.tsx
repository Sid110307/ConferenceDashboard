import { useState } from "react";

import { api } from "@/lib/api";
import { hasRole, useConference } from "@/lib/ConferenceContext";
import { fmtRelative, humanise } from "@/lib/format";
import { useRealtime } from "@/lib/useRealtime";
import { useUrlState } from "@/lib/useUrlState";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Mail, MessageSquare, Plus, Send, Settings2, Users } from "lucide-react";
import { z } from "zod";

import { Badge, StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useConfirm } from "@/components/ConfirmDialog";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { Tabs } from "@/components/Tabs";
import { useToast } from "@/components/Toast";

const Search = z.object({
	tab: z.enum(["campaigns", "templates", "providers"]).default("campaigns").optional(),
});

export const Route = createFileRoute("/c/$slug/comms")({
	validateSearch: s => Search.parse(s),
	component: CommsPage,
});

type Provider = {
	id: string;
	name: string;
	channel: "email" | "sms" | "whatsapp";
	provider: string;
	isDefault: boolean;
	isActive: boolean;
	configPublic?: Record<string, any> | null;
};
type Template = {
	id: string;
	name: string;
	channel: string;
	subject?: string | null;
	bodyText?: string | null;
	bodyHtml?: string | null;
	variables?: string[] | null;
};
type Campaign = {
	id: string;
	name: string;
	channel: string;
	status: string;
	templateId?: string | null;
	providerId?: string | null;
	recipientCount: number;
	sentCount: number;
	failedCount: number;
	audienceFilter?: Record<string, any> | null;
	scheduledFor?: string | null;
	createdAt: string;
};

function CommsPage() {
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();
	const tab = search.tab ?? "campaigns";
	const { membership } = useConference();
	const canEdit = hasRole(membership, "editor");

	return (
		<div className="p-6">
			<PageHeader
				title="Messaging Studio"
				description="Configure providers, design templates, and run email / SMS / WhatsApp campaigns."
			/>
			<Tabs
				value={tab}
				onValueChange={v => setSearch({ tab: v as any })}
				items={[
					{
						value: "campaigns",
						label: "Campaigns",
						content: <CampaignsTab canEdit={canEdit} />,
					},
					{
						value: "templates",
						label: "Templates",
						content: <TemplatesTab canEdit={canEdit} />,
					},
					{
						value: "providers",
						label: "Providers",
						content: <ProvidersTab canEdit={canEdit} />,
					},
				]}
			/>
		</div>
	);
}

const PROVIDER_KINDS: Record<string, { provider: string; label: string; fields: string[] }[]> = {
	email: [
		{ provider: "smtp", label: "SMTP", fields: ["host", "port", "username", "password"] },
		{ provider: "resend", label: "Resend", fields: ["apiKey"] },
		{ provider: "sendgrid", label: "SendGrid", fields: ["apiKey"] },
	],
	sms: [
		{ provider: "twilio", label: "Twilio", fields: ["accountSid", "authToken", "fromNumber"] },
		{ provider: "msg91", label: "MSG91", fields: ["authKey", "senderId"] },
	],
	whatsapp: [
		{
			provider: "twilio",
			label: "Twilio WhatsApp",
			fields: ["accountSid", "authToken", "fromNumber"],
		},
		{
			provider: "meta_cloud",
			label: "Meta Cloud API",
			fields: ["phoneNumberId", "accessToken"],
		},
	],
};

function ProvidersTab({ canEdit }: { canEdit: boolean }) {
	const { conference } = useConference();
	const list = useQuery<{ data: Provider[] }>({
		queryKey: ["providers", conference.slug],
		queryFn: () =>
			api.get<{ data: Provider[] }>(`/api/v1/c/${conference.slug}/comms/providers`),
	});
	const [open, setOpen] = useState(false);

	return (
		<>
			<div className="flex justify-end mb-3">
				{canEdit && (
					<Button
						variant="primary"
						size="sm"
						leadingIcon={<Plus size={13} />}
						onClick={() => setOpen(true)}
					>
						Add provider
					</Button>
				)}
			</div>
			{list.isLoading && <CenterSpinner />}
			{list.data?.data.length === 0 && (
				<Card>
					<EmptyState
						icon={<Settings2 size={24} />}
						title="No providers configured"
						hint="Add a provider before sending campaigns."
					/>
				</Card>
			)}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{(list.data?.data ?? []).map(p => (
					<Card key={p.id} pad="sm">
						<div className="flex items-start justify-between">
							<div className="flex items-center gap-2">
								{p.channel === "email" ? (
									<Mail size={16} className="text-ink-3" />
								) : (
									<MessageSquare size={16} className="text-ink-3" />
								)}
								<div>
									<div className="text-sm font-semibold text-ink">{p.name}</div>
									<div className="text-xs text-ink-3 capitalize">
										{p.channel} · {humanise(p.provider)}
									</div>
								</div>
							</div>
							<div className="flex flex-col items-end gap-1">
								{p.isDefault && (
									<Badge variant="accent" size="xs">
										Default
									</Badge>
								)}
								<Badge variant={p.isActive ? "success" : "neutral"} size="xs">
									{p.isActive ? "Active" : "Inactive"}
								</Badge>
							</div>
						</div>
					</Card>
				))}
			</div>
			{open && <ProviderDrawer onClose={() => setOpen(false)} />}
		</>
	);
}

function ProviderDrawer({ onClose }: { onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const [channel, setChannel] = useState<"email" | "sms" | "whatsapp">("email");
	const [providerKind, setProviderKind] = useState("smtp");
	const [name, setName] = useState("");
	const [isDefault, setIsDefault] = useState(true);
	const [config, setConfig] = useState<Record<string, string>>({});
	const [fromAddress, setFromAddress] = useState("");
	const [fromName, setFromName] = useState("");

	const kinds = PROVIDER_KINDS[channel] ?? [];
	const fields = kinds.find(k => k.provider === providerKind)?.fields ?? [];

	const create = useMutation({
		mutationFn: () =>
			api.post(`/api/v1/c/${conference.slug}/comms/providers`, {
				name,
				channel,
				provider: providerKind,
				isDefault,
				config,
				configPublic: {
					fromAddress: fromAddress || undefined,
					fromName: fromName || undefined,
				},
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["providers", conference.slug] });
			toast.success("Provider added");
			onClose();
		},
		onError: (e: any) => toast.error("Could not save provider", e.message),
	});

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title="Add messaging provider"
			width="md"
			footer={
				<>
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button
						variant="primary"
						loading={create.isPending}
						onClick={() => create.mutate()}
					>
						Save provider
					</Button>
				</>
			}
		>
			<div className="space-y-4">
				<FieldRow label="Display name" required>
					<Input
						value={name}
						onChange={e => setName(e.target.value)}
						placeholder="Primary email"
					/>
				</FieldRow>
				<div className="grid grid-cols-2 gap-3">
					<FieldRow label="Channel">
						<Select
							value={channel}
							onChange={e => {
								const ch = e.target.value as any;
								setChannel(ch);
								setProviderKind(PROVIDER_KINDS[ch]?.[0]?.provider ?? "");
								setConfig({});
							}}
						>
							<option value="email">Email</option>
							<option value="sms">SMS</option>
							<option value="whatsapp">WhatsApp</option>
						</Select>
					</FieldRow>
					<FieldRow label="Provider">
						<Select
							value={providerKind}
							onChange={e => {
								setProviderKind(e.target.value);
								setConfig({});
							}}
						>
							{kinds.map(k => (
								<option key={k.provider} value={k.provider}>
									{k.label}
								</option>
							))}
						</Select>
					</FieldRow>
				</div>

				<div className="space-y-3 pt-2 border-t border-line">
					<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
						Credentials (encrypted at rest)
					</div>
					{fields.map(f => (
						<FieldRow key={f} label={humanise(f)}>
							<Input
								type={/password|token|key/i.test(f) ? "password" : "text"}
								value={config[f] ?? ""}
								onChange={e => setConfig(c => ({ ...c, [f]: e.target.value }))}
							/>
						</FieldRow>
					))}
				</div>

				{channel === "email" && (
					<div className="grid grid-cols-2 gap-3 pt-2 border-t border-line">
						<FieldRow label="From address">
							<Input
								value={fromAddress}
								onChange={e => setFromAddress(e.target.value)}
							/>
						</FieldRow>
						<FieldRow label="From name">
							<Input value={fromName} onChange={e => setFromName(e.target.value)} />
						</FieldRow>
					</div>
				)}

				<label className="flex items-center gap-2 text-sm text-ink-2">
					<input
						type="checkbox"
						checked={isDefault}
						onChange={e => setIsDefault(e.target.checked)}
						className="size-4 accent-accent"
					/>
					Make this the default {channel} provider
				</label>
			</div>
		</EntityDrawer>
	);
}

function TemplatesTab({ canEdit }: { canEdit: boolean }) {
	const { conference } = useConference();
	const list = useQuery<{ data: Template[] }>({
		queryKey: ["templates", conference.slug],
		queryFn: () =>
			api.get<{ data: Template[] }>(`/api/v1/c/${conference.slug}/comms/templates`),
	});
	const [editing, setEditing] = useState<Template | null>(null);
	const [creating, setCreating] = useState(false);

	return (
		<>
			<div className="flex justify-end mb-3">
				{canEdit && (
					<Button
						variant="primary"
						size="sm"
						leadingIcon={<Plus size={13} />}
						onClick={() => setCreating(true)}
					>
						New template
					</Button>
				)}
			</div>
			{list.isLoading && <CenterSpinner />}
			{list.data?.data.length === 0 && (
				<Card>
					<EmptyState title="No templates yet" hint="Create one to use in campaigns." />
				</Card>
			)}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
				{(list.data?.data ?? []).map(t => (
					<button
						key={t.id}
						onClick={() => setEditing(t)}
						className="text-left bg-surface border border-line rounded-lg p-3.5 hover:border-accent transition-colors"
					>
						<div className="flex items-center justify-between">
							<span className="text-sm font-semibold text-ink">{t.name}</span>
							<Badge variant="neutral" size="sm" className="capitalize">
								{t.channel}
							</Badge>
						</div>
						{t.subject && <div className="mt-1 text-xs text-ink-2">{t.subject}</div>}
						<div className="mt-1 text-xs text-ink-3 line-clamp-2">{t.bodyText}</div>
					</button>
				))}
			</div>
			{(editing || creating) && (
				<TemplateDrawer
					template={editing}
					onClose={() => {
						setEditing(null);
						setCreating(false);
					}}
				/>
			)}
		</>
	);
}

function TemplateDrawer({ template, onClose }: { template: Template | null; onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const isEdit = !!template;
	const [form, setForm] = useState<Partial<Template>>(
		template ?? { channel: "email", name: "", bodyText: "" },
	);

	const save = useMutation({
		mutationFn: () => {
			const path = `/api/v1/c/${conference.slug}/comms/templates`;
			const body = {
				name: form.name,
				channel: form.channel,
				subject: form.subject || undefined,
				bodyText: form.bodyText,
				bodyHtml: form.bodyHtml || undefined,
			};
			return isEdit ? api.patch(`${path}/${template!.id}`, body) : api.post(path, body);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["templates", conference.slug] });
			toast.success(isEdit ? "Template updated" : "Template created");
			onClose();
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});

	const upd = (p: Partial<Template>) => setForm(f => ({ ...f, ...p }));

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={isEdit ? template!.name : "New template"}
			width="lg"
			footer={
				<>
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button
						variant="primary"
						loading={save.isPending}
						onClick={() => save.mutate()}
					>
						{isEdit ? "Save" : "Create"}
					</Button>
				</>
			}
		>
			<div className="space-y-4">
				<div className="grid grid-cols-2 gap-3">
					<FieldRow label="Name" required>
						<Input
							value={form.name ?? ""}
							onChange={e => upd({ name: e.target.value })}
						/>
					</FieldRow>
					<FieldRow label="Channel">
						<Select
							value={form.channel ?? "email"}
							onChange={e => upd({ channel: e.target.value })}
						>
							<option value="email">Email</option>
							<option value="sms">SMS</option>
							<option value="whatsapp">WhatsApp</option>
						</Select>
					</FieldRow>
				</div>
				{form.channel === "email" && (
					<FieldRow label="Subject">
						<Input
							value={form.subject ?? ""}
							onChange={e => upd({ subject: e.target.value })}
						/>
					</FieldRow>
				)}
				<FieldRow
					label="Body"
					required
					hint="Use {{name}}, {{attendeeCode}}, {{conference.name}} etc. for personalisation."
				>
					<Textarea
						value={form.bodyText ?? ""}
						onChange={e => upd({ bodyText: e.target.value })}
						className="min-h-[180px] font-mono text-[13px]"
						placeholder={"Dear {{name}},\n\nWelcome to {{conference.name}}..."}
					/>
				</FieldRow>
				{form.channel === "email" && (
					<FieldRow
						label="HTML body (optional)"
						hint="Leave blank to send plain text only."
					>
						<Textarea
							value={form.bodyHtml ?? ""}
							onChange={e => upd({ bodyHtml: e.target.value })}
							className="min-h-[120px] font-mono text-[13px]"
						/>
					</FieldRow>
				)}
			</div>
		</EntityDrawer>
	);
}

function CampaignsTab({ canEdit }: { canEdit: boolean }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const list = useQuery<{ data: Campaign[] }>({
		queryKey: ["campaigns", conference.slug],
		queryFn: () =>
			api.get<{ data: Campaign[] }>(`/api/v1/c/${conference.slug}/comms/campaigns`),
		refetchInterval: 5000,
	});

	useRealtime(conference.slug, ev => {
		if (ev.type.startsWith("campaign.")) {
			qc.invalidateQueries({ queryKey: ["campaigns", conference.slug] });
		}
	});

	const [builderOpen, setBuilderOpen] = useState(false);

	return (
		<>
			<div className="flex justify-end mb-3">
				{canEdit && (
					<Button
						variant="primary"
						size="sm"
						leadingIcon={<Plus size={13} />}
						onClick={() => setBuilderOpen(true)}
					>
						New campaign
					</Button>
				)}
			</div>
			{list.isLoading && <CenterSpinner />}
			{list.data?.data.length === 0 && (
				<Card>
					<EmptyState
						icon={<Send size={24} />}
						title="No campaigns yet"
						hint="Build one to message your attendees."
					/>
				</Card>
			)}
			<div className="space-y-2">
				{(list.data?.data ?? []).map(c => {
					const pct =
						c.recipientCount === 0
							? 0
							: ((c.sentCount + c.failedCount) / c.recipientCount) * 100;
					return (
						<Card key={c.id} pad="sm">
							<div className="flex items-center justify-between gap-3">
								<div className="min-w-0">
									<div className="flex items-center gap-2">
										<span className="text-sm font-semibold text-ink truncate">
											{c.name}
										</span>
										<Badge variant="neutral" size="xs" className="capitalize">
											{c.channel}
										</Badge>
									</div>
									<div className="mt-0.5 text-xs text-ink-3">
										{c.recipientCount} recipients · created{" "}
										{fmtRelative(c.createdAt)}
									</div>
								</div>
								<div className="flex items-center gap-3 shrink-0">
									<StatusBadge status={c.status} />
									{canEdit &&
										(c.status === "draft" || c.status === "scheduled") && (
											<CampaignSendButton campaign={c} />
										)}
								</div>
							</div>
							{(c.status === "sending" ||
								c.status === "completed" ||
								c.status === "completed_with_errors") && (
								<div className="mt-3">
									<ProgressBar
										value={pct}
										max={100}
										label={`${c.sentCount} sent${c.failedCount ? ` · ${c.failedCount} failed` : ""}`}
										hint={`${pct.toFixed(0)}%`}
										tone={c.failedCount > 0 ? "warn" : "success"}
										size="sm"
									/>
								</div>
							)}
						</Card>
					);
				})}
			</div>
			{builderOpen && <CampaignBuilder onClose={() => setBuilderOpen(false)} />}
		</>
	);
}

function CampaignSendButton({ campaign }: { campaign: Campaign }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const confirm = useConfirm();
	const send = useMutation({
		mutationFn: () =>
			api.post(`/api/v1/c/${conference.slug}/comms/campaigns/${campaign.id}/action`, {
				action: "send_now",
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["campaigns", conference.slug] });
			toast.success("Campaign sending", "The worker is dispatching messages now.");
		},
		onError: (e: any) => toast.error("Could not send", e.message),
	});
	return (
		<Button
			variant="primary"
			size="sm"
			loading={send.isPending}
			leadingIcon={<Send size={13} />}
			onClick={async () => {
				const ok = await confirm({
					title: `Send "${campaign.name}" now?`,
					description: `This will message ${campaign.recipientCount} recipient(s) over the ${campaign.channel} channel.`,
					confirmLabel: "Send now",
				});
				if (ok) send.mutate();
			}}
		>
			Send
		</Button>
	);
}

function CampaignBuilder({ onClose }: { onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();

	const [name, setName] = useState("");
	const [channel, setChannel] = useState("email");
	const [templateId, setTemplateId] = useState("");
	const [providerId, setProviderId] = useState("");
	const [audience, setAudience] = useState<Record<string, any>>({ all: true });
	const [previewCount, setPreviewCount] = useState<number | null>(null);

	const templates = useQuery<{ data: Template[] }>({
		queryKey: ["templates", conference.slug],
		queryFn: () =>
			api.get<{ data: Template[] }>(`/api/v1/c/${conference.slug}/comms/templates`),
	});
	const providers = useQuery<{ data: Provider[] }>({
		queryKey: ["providers", conference.slug],
		queryFn: () =>
			api.get<{ data: Provider[] }>(`/api/v1/c/${conference.slug}/comms/providers`),
	});

	const channelTemplates = (templates.data?.data ?? []).filter(t => t.channel === channel);
	const channelProviders = (providers.data?.data ?? []).filter(p => p.channel === channel);

	const preview = useMutation({
		mutationFn: () =>
			api.post<{ count: number }>(
				`/api/v1/c/${conference.slug}/comms/campaigns/audience-preview`,
				{ channel, audienceFilter: audience },
			),
		onSuccess: d => setPreviewCount(d.count),
		onError: (e: any) => toast.error("Preview failed", e.message),
	});

	const create = useMutation({
		mutationFn: () =>
			api.post(`/api/v1/c/${conference.slug}/comms/campaigns`, {
				name,
				channel,
				templateId,
				providerId,
				audienceFilter: audience,
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["campaigns", conference.slug] });
			toast.success("Campaign created", "Saved as draft for review.");
			onClose();
		},
		onError: (e: any) => toast.error("Could not create campaign", e.message),
	});

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title="New campaign"
			subtitle="Pick an audience, template, and provider"
			width="lg"
			footer={
				<>
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button
						variant="primary"
						loading={create.isPending}
						disabled={!name || !templateId || !providerId}
						onClick={() => create.mutate()}
					>
						Create as draft
					</Button>
				</>
			}
		>
			<div className="space-y-4">
				<FieldRow label="Campaign name" required>
					<Input value={name} onChange={e => setName(e.target.value)} />
				</FieldRow>
				<FieldRow label="Channel">
					<Select
						value={channel}
						onChange={e => {
							setChannel(e.target.value);
							setTemplateId("");
							setProviderId("");
							setPreviewCount(null);
						}}
					>
						<option value="email">Email</option>
						<option value="sms">SMS</option>
						<option value="whatsapp">WhatsApp</option>
					</Select>
				</FieldRow>
				<div className="grid grid-cols-2 gap-3">
					<FieldRow label="Template" required>
						<Select value={templateId} onChange={e => setTemplateId(e.target.value)}>
							<option value="">— select —</option>
							{channelTemplates.map(t => (
								<option key={t.id} value={t.id}>
									{t.name}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="Provider" required>
						<Select value={providerId} onChange={e => setProviderId(e.target.value)}>
							<option value="">— select —</option>
							{channelProviders.map(p => (
								<option key={p.id} value={p.id}>
									{p.name}
									{p.isDefault ? " (default)" : ""}
								</option>
							))}
						</Select>
					</FieldRow>
				</div>
				<div className="pt-3 border-t border-line space-y-3">
					<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
						Audience
					</div>
					<label className="flex items-center gap-2 text-sm text-ink-2">
						<input
							type="checkbox"
							checked={!!audience.all}
							onChange={e => setAudience(e.target.checked ? { all: true } : {})}
							className="size-4 accent-accent"
						/>
						All attendees
					</label>
					{!audience.all && (
						<div className="grid grid-cols-2 gap-3">
							<FieldRow label="Category">
								<Select
									value={audience.category?.[0] ?? ""}
									onChange={e =>
										setAudience(a => ({
											...a,
											category: e.target.value ? [e.target.value] : undefined,
										}))
									}
								>
									<option value="">Any</option>
									{["delegate", "speaker", "vip", "student", "faculty"].map(c => (
										<option key={c} value={c}>
											{c}
										</option>
									))}
								</Select>
							</FieldRow>
							<FieldRow label="Check-in status">
								<Select
									value={audience.checkinStatus?.[0] ?? ""}
									onChange={e =>
										setAudience(a => ({
											...a,
											checkinStatus: e.target.value
												? [e.target.value]
												: undefined,
										}))
									}
								>
									<option value="">Any</option>
									<option value="checked_in">Checked in</option>
									<option value="not_checked_in">Not checked in</option>
								</Select>
							</FieldRow>
							<FieldRow label="VIP only">
								<Select
									value={audience.isVip === true ? "true" : ""}
									onChange={e =>
										setAudience(a => ({
											...a,
											isVip: e.target.value === "true" ? true : undefined,
										}))
									}
								>
									<option value="">Any</option>
									<option value="true">VIP only</option>
								</Select>
							</FieldRow>
						</div>
					)}

					<div className="flex items-center gap-3">
						<Button
							variant="secondary"
							size="sm"
							leadingIcon={<Users size={13} />}
							loading={preview.isPending}
							onClick={() => preview.mutate()}
						>
							Preview audience
						</Button>
						{previewCount != null && (
							<Badge variant="accent">{previewCount} recipient(s)</Badge>
						)}
					</div>
				</div>
			</div>
		</EntityDrawer>
	);
}
