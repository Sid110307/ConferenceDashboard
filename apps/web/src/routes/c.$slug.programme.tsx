import React, { useState } from "react";

import { api } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { fmtDate, fmtTime, humanise } from "@/lib/format";
import { useUrlState } from "@/lib/useUrlState";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Layers, MapPin, Mic2, Plus } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DatePickerInput } from "@/components/DatePicker";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { Tabs } from "@/components/Tabs";
import { useToast } from "@/components/Toast";

const Search = z.object({
	tab: z.enum(["sessions", "speakers", "venues", "tracks"]).default("sessions").optional(),
});

export const Route = createFileRoute("/c/$slug/programme")({
	validateSearch: s => Search.parse(s),
	component: ProgrammePage,
});

type Session = {
	id: string;
	title: string;
	description?: string | null;
	sessionType?: string | null;
	startTime?: string | null;
	endTime?: string | null;
	venueName?: string | null;
	trackName?: string | null;
	status: string;
	isPublic: boolean;
};
type Speaker = {
	id: string;
	name: string;
	bio?: string;
	email?: string;
	phone?: string;
	website?: string;
	institution?: string;
	designation?: string;
	salutation?: string;
	isVip: boolean;
	isPublic: boolean;
};
type Venue = {
	id: string;
	name: string;
	description?: string;
	hasProjector: boolean;
	hasMic: boolean;
	hasAc: boolean;
	hasRecording: boolean;
	capacity?: number | null;
	location?: string | null;
	isPublic: boolean;
};
type Track = {
	id: string;
	name: string;
	description?: string;
	isPublic?: boolean;
};

function ProgrammePage() {
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();
	const tab = search.tab ?? "sessions";
	const { membership } = useConference();
	const canEdit = hasAtLeastRole(membership, "editor");

	return (
		<div className="p-6">
			<PageHeader
				title="Programme"
				description="Sessions, speakers, venues, and tracks for the conference agenda."
			/>
			<Tabs
				value={tab}
				onValueChange={v => setSearch({ tab: v as any })}
				items={[
					{
						value: "sessions",
						label: "Sessions",
						content: <SessionsTab canEdit={canEdit} />,
					},
					{
						value: "speakers",
						label: "Speakers",
						content: <SpeakersTab canEdit={canEdit} />,
					},
					{ value: "venues", label: "Venues", content: <VenuesTab canEdit={canEdit} /> },
					{ value: "tracks", label: "Tracks", content: <TracksTab canEdit={canEdit} /> },
				]}
			/>
		</div>
	);
}

function SessionsTab({ canEdit }: { canEdit: boolean }) {
	const { conference } = useConference();
	const sessions = useQuery<{ data: Session[] }>({
		queryKey: ["sessions", conference.slug],
		queryFn: () =>
			api.get<{ data: Session[] }>(`/api/v1/c/${conference.slug}/programme/sessions`, {
				pageSize: 200,
			}),
	});
	const [open, setOpen] = useState<Session | null>(null);
	const [creating, setCreating] = useState(false);

	const grouped = new Map<string, Session[]>();
	for (const s of sessions.data?.data ?? []) {
		const day = s.startTime ? s.startTime.slice(0, 10) : "Unscheduled";
		if (!grouped.has(day)) grouped.set(day, []);
		grouped.get(day)!.push(s);
	}

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
						Add session
					</Button>
				)}
			</div>
			{sessions.isLoading && <CenterSpinner />}
			{sessions.data?.data.length === 0 && (
				<Card>
					<EmptyState
						icon={<CalendarDays size={24} />}
						title="No sessions yet"
						hint="Build the agenda by adding sessions."
					/>
				</Card>
			)}
			<div className="space-y-5">
				{[...grouped.entries()].map(([day, items]) => (
					<div key={day}>
						<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-2">
							{day === "Unscheduled" ? day : fmtDate(day, "EEEE, d MMMM")}
						</div>
						<div className="space-y-2">
							{items.map(s => (
								<button
									key={s.id}
									onClick={() => setOpen(s)}
									className="w-full hover:cursor-pointer text-left bg-surface border border-line rounded-lg p-3 hover:border-accent transition-colors flex items-start gap-3"
								>
									<div className="text-xs tabular-nums text-ink-2 w-32 shrink-0">
										{s.startTime ? fmtTime(s.startTime) : "—"}
										{s.endTime && ` - ${fmtTime(s.endTime)}`}
									</div>
									<div className="min-w-0 flex-1">
										<div className="text-sm font-medium text-ink truncate">
											{s.title}
										</div>
										<div className="mt-0.5 text-xs text-ink-3 flex items-center gap-1 flex-wrap">
											{s.sessionType && (
												<Badge size="xs">{humanise(s.sessionType)}</Badge>
											)}
											{s.venueName && (
												<Badge size="xs" variant="accent">
													{humanise(s.venueName)}
												</Badge>
											)}
											{s.trackName && (
												<Badge size="xs" variant="accent">
													{humanise(s.trackName)}
												</Badge>
											)}
											{s.status && (
												<Badge
													size="xs"
													variant={
														s.status === "ongoing"
															? "accent"
															: s.status === "done"
																? "success"
																: s.status === "cancelled"
																	? "warn"
																	: "neutral"
													}
												>
													{humanise(s.status)}
												</Badge>
											)}
											{!s.isPublic && (
												<Badge size="xs" variant="warn">
													Private
												</Badge>
											)}
										</div>
									</div>
								</button>
							))}
						</div>
					</div>
				))}
			</div>
			{(open || creating) && (
				<SessionDrawer
					session={open}
					onClose={() => {
						setOpen(null);
						setCreating(false);
					}}
				/>
			)}
		</>
	);
}

function SessionDrawer({ session, onClose }: { session: Session | null; onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const isEdit = !!session;
	const [form, setForm] = useState<Partial<Session>>(session ?? {});

	const venues = useQuery<{ data: Venue[] }>({
		queryKey: ["venues", conference.slug],
		queryFn: () => api.get<{ data: Venue[] }>(`/api/v1/c/${conference.slug}/programme/venues`),
	});
	const tracks = useQuery<{ data: Track[] }>({
		queryKey: ["tracks", conference.slug],
		queryFn: () => api.get<{ data: Track[] }>(`/api/v1/c/${conference.slug}/programme/tracks`),
	});

	const save = useMutation({
		mutationFn: () => {
			const path = `/api/v1/c/${conference.slug}/programme/sessions`;
			const body = {
				title: form.title,
				description: form.description || undefined,
				startTime: form.startTime || undefined,
				endTime: form.endTime || undefined,
				venueName: form.venueName || undefined,
				trackName: form.trackName || undefined,
				sessionType: form.sessionType || undefined,
				status: form.status || undefined,
				isPublic: form.isPublic,
			};
			return isEdit ? api.patch(`${path}/${session!.id}`, body) : api.post(path, body);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["sessions", conference.slug] }).catch(console.error);
			toast.success(isEdit ? "Session updated" : "Session added");
			onClose();
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});
	const upd = (p: Partial<Session>) => setForm(f => ({ ...f, ...p }));

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={isEdit ? session!.title : "New session"}
			width="md"
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
				<FieldRow label="Title" required>
					<Input
						value={form.title ?? ""}
						onChange={e => upd({ title: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Description">
					<Textarea
						value={form.description ?? ""}
						onChange={e => upd({ description: e.target.value })}
					/>
				</FieldRow>
				<div className="grid grid-cols-2 gap-3">
					<FieldRow label="Start time">
						<DatePickerInput
							value={form.startTime ?? ""}
							onChange={e => upd({ startTime: e })}
						/>
					</FieldRow>
					<FieldRow label="End time">
						<DatePickerInput
							value={form.endTime ?? ""}
							onChange={e => upd({ endTime: e })}
						/>
					</FieldRow>
					<FieldRow label="Venue">
						<Select
							value={form.venueName ?? ""}
							onChange={e => upd({ venueName: e.target.value || null })}
						>
							<option value="">—</option>
							{(venues.data?.data ?? []).map(v => (
								<option key={v.id} value={v.id}>
									{v.name}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="Session type">
						<Select
							value={form.sessionType ?? "invited"}
							onChange={e => upd({ sessionType: e.target.value })}
						>
							{[
								"keynote",
								"invited",
								"panel",
								"workshop",
								"poster",
								"break",
								"social",
								"vip",
							].map(v => (
								<option key={v} value={v}>
									{humanise(v)}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="Status">
						<Select
							value={form.status ?? "upcoming"}
							onChange={e => upd({ status: e.target.value })}
						>
							{["upcoming", "ongoing", "done", "cancelled"].map(v => (
								<option key={v} value={v}>
									{humanise(v)}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="Track">
						<Select
							value={form.trackName ?? ""}
							onChange={e => upd({ trackName: e.target.value || null })}
						>
							<option value="">—</option>
							{(tracks.data?.data ?? []).map(t => (
								<option key={t.id} value={t.id}>
									{t.name}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="Publicly visible">
						<Select
							value={form.isPublic ? "yes" : "no"}
							onChange={e => upd({ isPublic: e.target.value === "yes" })}
						>
							<option value="yes">Yes</option>
							<option value="no">No</option>
						</Select>
					</FieldRow>
				</div>
			</div>
		</EntityDrawer>
	);
}

function SimpleCrudTab<T extends { id: string; name: string }>({
	canEdit,
	entityPath,
	queryKey,
	label,
	icon,
	fields,
}: {
	canEdit: boolean;
	entityPath: string;
	queryKey: string;
	label: string;
	icon: React.ReactNode;
	fields: {
		key: string;
		label: string;
		required?: boolean;
		number?: boolean;
		textarea?: boolean;
		dropdown?: boolean;
	}[];
}) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const list = useQuery<{ data: T[] }>({
		queryKey: [queryKey, conference.slug],
		queryFn: () =>
			api.get<{ data: T[] }>(`/api/v1/c/${conference.slug}/programme/${entityPath}`, {
				pageSize: 200,
			}),
	});
	const [editing, setEditing] = useState<T | null>(null);
	const [creating, setCreating] = useState(false);
	const [form, setForm] = useState<Record<string, any>>({});

	const open = (item: T | null) => {
		setEditing(item);
		setCreating(!item);
		setForm(item ?? {});
	};

	const save = useMutation({
		mutationFn: () => {
			const path = `/api/v1/c/${conference.slug}/programme/${entityPath}`;
			return editing ? api.patch(`${path}/${editing.id}`, form) : api.post(path, form);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: [queryKey, conference.slug] }).catch(console.error);
			toast.success("Saved");
			setEditing(null);
			setCreating(false);
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});

	return (
		<>
			<div className="flex justify-end mb-3">
				{canEdit && (
					<Button
						variant="primary"
						size="sm"
						leadingIcon={<Plus size={13} />}
						onClick={() => open(null)}
					>
						Add {label}
					</Button>
				)}
			</div>
			{list.isLoading && <CenterSpinner />}
			{list.data?.data.length === 0 && (
				<Card>
					<EmptyState title={`No ${label}s yet`} />
				</Card>
			)}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{(list.data?.data ?? []).map(item => (
					<button
						key={item.id}
						onClick={() => open(item)}
						className="text-left hover:cursor-pointer bg-surface border border-line rounded-lg p-3.5 hover:border-accent transition-colors flex items-center gap-3"
					>
						<div className="size-9 rounded-md bg-accent-soft text-accent-soft-fg flex items-center justify-center shrink-0">
							{icon}
						</div>
						<div className="text-sm font-medium text-ink truncate">{item.name}</div>
					</button>
				))}
			</div>
			{(editing || creating) && (
				<EntityDrawer
					open
					onOpenChange={v => {
						if (!v) {
							setEditing(null);
							setCreating(false);
						}
					}}
					title={editing ? editing.name : `New ${label}`}
					width="sm"
					footer={
						<>
							<Button
								variant="ghost"
								onClick={() => {
									setEditing(null);
									setCreating(false);
								}}
							>
								Cancel
							</Button>
							<Button
								variant="primary"
								loading={save.isPending}
								onClick={() => save.mutate()}
							>
								Save
							</Button>
						</>
					}
				>
					<div className="space-y-4">
						{fields.map(f => (
							<FieldRow key={f.key} label={f.label} required={f.required}>
								{f.textarea ? (
									<Textarea
										value={form[f.key] ?? ""}
										onChange={e =>
											setForm(p => ({ ...p, [f.key]: e.target.value }))
										}
									/>
								) : f.dropdown ? (
									<Select
										value={form[f.key] ? "yes" : "no"}
										onChange={e =>
											setForm(p => ({
												...p,
												[f.key]: e.target.value === "yes",
											}))
										}
									>
										<option value="">—</option>
										<option value="yes">Yes</option>
										<option value="no">No</option>
									</Select>
								) : f.number ? (
									<Input
										type="number"
										value={form[f.key] ?? ""}
										onChange={e =>
											setForm(p => ({
												...p,
												[f.key]: e.target.value
													? parseInt(e.target.value)
													: null,
											}))
										}
									/>
								) : (
									<Input
										value={form[f.key] ?? ""}
										onChange={e =>
											setForm(p => ({ ...p, [f.key]: e.target.value }))
										}
									/>
								)}
							</FieldRow>
						))}
					</div>
				</EntityDrawer>
			)}
		</>
	);
}

function SpeakersTab({ canEdit }: { canEdit: boolean }) {
	return (
		<SimpleCrudTab<Speaker>
			canEdit={canEdit}
			entityPath="speakers"
			queryKey="speakers"
			label="speaker"
			icon={<Mic2 size={16} />}
			fields={[
				{ key: "name", label: "Name", required: true },
				{ key: "bio", label: "Bio", textarea: true },
				{ key: "email", label: "Email" },
				{ key: "phone", label: "Phone" },
				{ key: "website", label: "Website" },
				{ key: "institution", label: "Institution" },
				{ key: "designation", label: "Designation" },
				{ key: "salutation", label: "Salutation" },
				{
					key: "isVip",
					label: "VIP speaker (highlighted in the programme)",
					dropdown: true,
				},
				{ key: "isPublic", label: "Publicly visible", dropdown: true },
			]}
		/>
	);
}
function VenuesTab({ canEdit }: { canEdit: boolean }) {
	return (
		<SimpleCrudTab<Venue>
			canEdit={canEdit}
			entityPath="venues"
			queryKey="venues"
			label="venue"
			icon={<MapPin size={16} />}
			fields={[
				{ key: "name", label: "Name", required: true },
				{ key: "description", label: "Description", textarea: true },
				{ key: "capacity", label: "Capacity", number: true },
				{ key: "location", label: "Location" },
				{ key: "hasProjector", label: "Has projector", dropdown: true },
				{ key: "hasMic", label: "Has microphone", dropdown: true },
				{ key: "hasAc", label: "Has air conditioning", dropdown: true },
				{ key: "hasRecording", label: "Can be recorded", dropdown: true },
				{ key: "isPublic", label: "Publicly visible", dropdown: true },
			]}
		/>
	);
}
function TracksTab({ canEdit }: { canEdit: boolean }) {
	return (
		<SimpleCrudTab<Track>
			canEdit={canEdit}
			entityPath="tracks"
			queryKey="tracks"
			label="track"
			icon={<Layers size={16} />}
			fields={[
				{ key: "name", label: "Name", required: true },
				{ key: "description", label: "Description", textarea: true },
				{ key: "isPublic", label: "Publicly visible", dropdown: true },
			]}
		/>
	);
}
