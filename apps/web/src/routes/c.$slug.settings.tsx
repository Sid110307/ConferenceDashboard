import { useState } from "react";

import { api } from "@/lib/api";
import { ActiveConference, hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { humanise } from "@/lib/format";
import { useUrlState } from "@/lib/useUrlState";
import { conferenceUpdateSchema, type ConferenceUpdateInput } from "@conference/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building, Palette, Save, SlidersHorizontal, Trash2, Upload } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DatePickerInput } from "@/components/DatePicker";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { Tabs } from "@/components/Tabs";
import { useToast } from "@/components/Toast";

const Search = z.object({
	tab: z.enum(["profile", "appearance", "advanced"]).default("profile").optional(),
});

export const Route = createFileRoute("/c/$slug/settings")({
	validateSearch: s => Search.parse(s),
	component: SettingsPage,
});

function SettingsPage() {
	const { membership } = useConference();
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();
	const tab = search.tab ?? "profile";

	if (!hasAtLeastRole(membership, "admin")) {
		return (
			<div className="p-6">
				<PageHeader title="Settings" />
				<Card>
					<EmptyState
						title="Admin access required"
						hint="Conference settings can only be changed by admins."
					/>
				</Card>
			</div>
		);
	}

	return (
		<div className="p-6">
			<PageHeader title="Settings" description="Configure this conference workspace." />
			<Tabs
				value={tab}
				onValueChange={v => setSearch({ tab: v as any })}
				items={[
					{ value: "profile", label: "Profile", content: <ProfileTab /> },
					{ value: "appearance", label: "Appearance", content: <AppearanceTab /> },
					{ value: "advanced", label: "Advanced", content: <AdvancedTab /> },
				]}
			/>
		</div>
	);
}

function ProfileTab() {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();

	const profile = useQuery<{ conference: ActiveConference }>({
		queryKey: ["tenant", conference.slug],
		queryFn: () => api.get<{ conference: ActiveConference }>(`/api/v1/c/${conference.slug}`),
	});
	const [form, setForm] = useState<Partial<ActiveConference>>({});
	const merged = { ...(profile.data?.conference ?? {}), ...form };

	const save = useMutation({
		mutationFn: () =>
			api.patch(
				`/api/v1/c/${conference.slug}`,
				conferenceUpdateSchema.parse(form) as ConferenceUpdateInput,
			),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["tenant", conference.slug] }).catch(console.error);
			qc.invalidateQueries({ queryKey: ["active-conference", conference.slug] }).catch(
				console.error,
			);
			toast.success("Conference profile saved");
			setForm({});
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});

	if (profile.isLoading) return <CenterSpinner />;
	const upd = (p: Partial<ActiveConference>) => setForm(f => ({ ...f, ...p }));

	return (
		<Card
			title="Conference profile"
			icon={<Building size={16} />}
			actions={
				<Button
					variant="primary"
					size="sm"
					loading={save.isPending}
					disabled={Object.keys(form).length === 0}
					leadingIcon={<Save size={13} />}
					onClick={() => save.mutate()}
				>
					Save changes
				</Button>
			}
		>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<FieldRow label="Name" required className="sm:col-span-2">
					<Input
						value={merged.name ?? ""}
						onChange={e => upd({ name: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Short name" required>
					<Input
						value={merged.shortName ?? ""}
						onChange={e => upd({ shortName: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Tagline / description">
					<Input
						value={merged.description ?? ""}
						onChange={e => upd({ description: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Start date">
					<DatePickerInput
						value={merged.startDate?.slice(0, 10) ?? ""}
						onChange={e => upd({ startDate: e })}
					/>
				</FieldRow>
				<FieldRow label="End date">
					<DatePickerInput
						value={merged.endDate?.slice(0, 10) ?? ""}
						onChange={e => upd({ endDate: e })}
					/>
				</FieldRow>
				<FieldRow label="Conference Status">
					<Select
						value={merged.publicStatus ?? "draft"}
						onChange={e => upd({ publicStatus: e.target.value as any })}
					>
						{["draft", "active", "archived"].map(s => (
							<option key={s} value={s}>
								{humanise(s)}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Venue name">
					<Input
						value={merged.venueName ?? ""}
						onChange={e => upd({ venueName: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Venue address" className="sm:col-span-2">
					<Textarea
						value={merged.venueAddress ?? ""}
						onChange={e => upd({ venueAddress: e.target.value })}
					/>
				</FieldRow>
			</div>
		</Card>
	);
}

type Theme = {
	primaryColor?: string | null;
	secondaryColor?: string | null;
	accentColor?: string | null;
	logoFileId?: string | null;
};

function AppearanceTab() {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();

	const theme = useQuery<{ data: Theme }>({
		queryKey: ["conf-theme", conference.slug],
		queryFn: () => api.get<{ data: Theme }>(`/api/v1/c/${conference.slug}/settings/theme`),
	});
	const [form, setForm] = useState<Partial<Theme>>({});
	const [uploadingLogo, setUploadingLogo] = useState(false);
	const merged = { ...(theme.data?.data ?? {}), ...form };
	const logoFileId = merged.logoFileId ?? null;

	const logoPreview = useQuery<{ url: string }>({
		queryKey: ["conf-theme-logo", conference.slug, logoFileId],
		queryFn: () =>
			api.get<{ url: string }>(`/api/v1/c/${conference.slug}/files/${logoFileId}/download`),
		enabled: !!logoFileId,
		staleTime: 1000 * 60 * 10,
	});

	const save = useMutation({
		mutationFn: () =>
			api.put(`/api/v1/c/${conference.slug}/settings/theme`, {
				primaryColor: merged.primaryColor,
				secondaryColor: merged.secondaryColor,
				accentColor: merged.accentColor,
				logoFileId: merged.logoFileId,
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["conf-theme", conference.slug] }).catch(
				console.error,
			);
			toast.success("Theme saved");
			setForm({});
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});

	if (theme.isLoading) return <CenterSpinner />;
	const upd = (p: Partial<Theme>) => setForm(f => ({ ...f, ...p }));

	const uploadLogo = async (file: File) => {
		setUploadingLogo(true);
		try {
			const ext = file.name.toLowerCase().split(".").pop() ?? "";
			const contentType =
				file.type && file.type !== "application/octet-stream"
					? file.type
					: ext === "svg"
						? "image/svg+xml"
						: ext === "jpg" || ext === "jpeg"
							? "image/jpeg"
							: ext === "webp"
								? "image/webp"
								: "image/png";

			const presign = await api.post<{ fileId: string; uploadUrl: string }>(
				`/api/v1/c/${conference.slug}/files/presign`,
				{
					filename: file.name,
					contentType,
					size: file.size,
					purpose: "conference_logo",
				},
			);

			const put = await fetch(presign.uploadUrl, {
				method: "PUT",
				body: file,
				headers: { "Content-Type": contentType },
			});
			if (!put.ok) throw new Error("logo upload failed");

			await api.post(`/api/v1/c/${conference.slug}/files/${presign.fileId}/commit`, {});
			upd({ logoFileId: presign.fileId });
			toast.success("Logo uploaded", "Save theme to apply it.");
		} catch (e: any) {
			toast.error("Logo upload failed", e.message);
		} finally {
			setUploadingLogo(false);
		}
	};

	const styles = getComputedStyle(document.documentElement);
	const swatches: { key: keyof Theme; label: string; fallback: string }[] = [
		{
			key: "primaryColor",
			label: "Primary",
			fallback: styles.getPropertyValue("--color-accent").trim() || "#000000",
		},
		{
			key: "secondaryColor",
			label: "Secondary",
			fallback: styles.getPropertyValue("--color-accent-soft").trim() || "#000000",
		},
		{
			key: "accentColor",
			label: "Accent",
			fallback: styles.getPropertyValue("--color-info").trim() || "#000000",
		},
	];

	return (
		<Card
			title="Appearance"
			icon={<Palette size={16} />}
			actions={
				<Button
					variant="primary"
					size="sm"
					loading={save.isPending}
					leadingIcon={<Save size={13} />}
					onClick={() => save.mutate()}
				>
					Save theme
				</Button>
			}
		>
			<div className="space-y-4">
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
					{swatches.map(s => (
						<FieldRow key={s.key} label={s.label}>
							<div className="flex items-center gap-2">
								<input
									type="color"
									value={(merged[s.key] as string) ?? s.fallback}
									onChange={e =>
										upd({ [s.key]: e.target.value } as Partial<Theme>)
									}
									className="size-9 rounded-md border border-line cursor-pointer bg-surface"
								/>
								<Input
									value={(merged[s.key] as string) ?? ""}
									onChange={e =>
										upd({ [s.key]: e.target.value } as Partial<Theme>)
									}
									placeholder={s.fallback}
									className="font-mono text-[13px] lowercase"
								/>
							</div>
						</FieldRow>
					))}
				</div>
				<FieldRow
					label="Conference logo"
					hint="Supported formats: PNG, JPEG, WEBP, SVG. Max size: 5MB"
				>
					<div className="flex flex-wrap items-center gap-2">
						<label className="inline-flex items-center">
							<input
								type="file"
								accept="image/png,image/jpeg,image/webp,image/svg+xml"
								className="hidden"
								onChange={e => {
									const f = e.target.files?.[0];
									if (f) void uploadLogo(f);
									e.currentTarget.value = "";
								}}
							/>
							<Button
								variant="secondary"
								size="sm"
								loading={uploadingLogo}
								leadingIcon={<Upload size={13} />}
								onClick={e => e.currentTarget.previousElementSibling?.click()}
							>
								Upload logo
							</Button>
						</label>
						<Button
							variant="ghost"
							size="sm"
							disabled={!logoFileId}
							onClick={() => upd({ logoFileId: null })}
							leadingIcon={<Trash2 size={13} />}
						>
							Clear
						</Button>
						{!logoFileId && <span className="text-xs text-ink-3">No logo set</span>}
					</div>
				</FieldRow>
				{logoFileId && logoPreview.data?.url && (
					<div className="pt-2">
						<img
							src={logoPreview.data.url}
							alt="Logo preview"
							className="h-32 object-contain border border-line rounded-md"
						/>
					</div>
				)}
			</div>
		</Card>
	);
}

type AppSetting = { key: string; value: string };

function AdvancedTab() {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();

	const settings = useQuery<{ data: AppSetting }>({
		queryKey: ["app-settings", conference.slug],
		queryFn: () => api.get<{ data: AppSetting }>(`/api/v1/c/${conference.slug}/settings/app`),
	});

	const [draft, setDraft] = useState<Record<string, string>>({});
	const [newKey, setNewKey] = useState("");
	const [newValue, setNewValue] = useState("");

	const put = useMutation({
		mutationFn: (input: { key: string; value: string }) =>
			api.put(`/api/v1/c/${conference.slug}/settings/app/${input.key}`, {
				value: input.value,
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["app-settings", conference.slug] }).catch(
				console.error,
			);
			toast.success("Setting saved");
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});

	if (settings.isLoading) return <CenterSpinner />;
	return (
		<Card title="Advanced settings" icon={<SlidersHorizontal size={16} />}>
			<div className="space-y-3">
				<p className="text-xs text-ink-3">
					These settings are for advanced users only. Change these only if you know what
					they do.
				</p>
				<div className="divide-y divide-line">
					{(Object.entries(settings.data?.data || {}) ?? []).map(s => (
						<div key={s[0]} className="flex items-center gap-3 py-2.5">
							<span className="flex-1 font-mono text-xs text-ink-2 truncate">
								{s[0]}
							</span>
							<Input
								value={draft[s[0]] ?? s[1]}
								onChange={e => setDraft(d => ({ ...d, [s[0]]: e.target.value }))}
								className="w-full flex-1"
							/>
							<Button
								variant="secondary"
								size="sm"
								disabled={(draft[s[0]] ?? s[1]) === s[1]}
								onClick={() =>
									put.mutate({ key: s[0], value: draft[s[0]] ?? s[1] })
								}
							>
								Save
							</Button>
						</div>
					))}
				</div>

				<div className="flex items-center gap-2 pt-3 border-t border-line">
					<Input
						value={newKey}
						onChange={e => setNewKey(e.target.value)}
						placeholder="new.setting.key"
						className="flex-1 w-56 font-mono text-[13px]"
					/>
					<Input
						value={newValue}
						onChange={e => setNewValue(e.target.value)}
						placeholder="value"
						className="flex-1"
					/>
					<Button
						variant="primary"
						size="sm"
						disabled={!newKey}
						onClick={() => {
							put.mutate({ key: newKey, value: newValue });
							setNewKey("");
							setNewValue("");
						}}
					>
						Add
					</Button>
				</div>
			</div>
		</Card>
	);
}
