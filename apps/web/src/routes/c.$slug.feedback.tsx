import { useMemo, useState } from "react";

import { api } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { fmtDateTime } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import { type Attendee } from "@conference/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Star, Trash2 } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useConfirm } from "@/components/ConfirmDialog";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

const Search = z.object({
	page: z.coerce.number().int().min(1).default(1).optional(),
});

export const Route = createFileRoute("/c/$slug/feedback")({
	validateSearch: s => Search.parse(s),
	component: FeedbackPage,
});

type Feedback = {
	id: string;
	attendeeId?: string | null;
	sessionId?: string | null;
	rating?: number | null;
	comments?: string | null;
	isPublic: boolean;
	submittedAt: string;
};

type Session = { id: string; title: string; sessionType?: string | null };

const PAGE_SIZE = 20;

function FeedbackPage() {
	const { membership, conference } = useConference();
	const canEdit = hasAtLeastRole(membership, "editor");
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();
	const list = useListQuery<Feedback>({
		key: ["feedback", conference.slug],
		path: `/api/v1/c/${conference.slug}/feedback`,
		params: { page: search.page, pageSize: PAGE_SIZE },
	});
	const attendees = useListQuery<Attendee>({
		key: ["feedback-attendees", conference.slug],
		path: `/api/v1/c/${conference.slug}/attendees`,
		params: { pageSize: 200 },
	});
	const sessions = useListQuery<Session>({
		key: ["feedback-sessions", conference.slug],
		path: `/api/v1/c/${conference.slug}/programme/sessions`,
		params: { pageSize: 200 },
	});
	const rows = list.data?.data ?? [];
	const total = list.data?.pagination?.total ?? 0;
	const [editing, setEditing] = useState<Feedback | null>(null);
	const [creating, setCreating] = useState(false);

	const attendeeMap = useMemo(
		() =>
			new Map(
				(attendees.data?.data ?? []).map(
					a => [a.id, `${a.name} (${a.attendeeCode})`] as const,
				),
			),
		[attendees.data],
	);
	const sessionMap = useMemo(
		() => new Map((sessions.data?.data ?? []).map(s => [s.id, s.title] as const)),
		[sessions.data],
	);

	const cols: Column<Feedback>[] = [
		{
			key: "attendee",
			header: "Attendee",
			cell: r =>
				attendeeMap.get(r.attendeeId ?? "") ??
				(r.attendeeId ? r.attendeeId.slice(0, 8) : "—"),
		},
		{
			key: "session",
			header: "Session",
			cell: r =>
				sessionMap.get(r.sessionId ?? "") ?? (r.sessionId ? r.sessionId.slice(0, 8) : "—"),
		},
		{
			key: "rating",
			header: "Rating",
			cell: r => (
				<div className="flex items-center gap-1">
					{Array.from({ length: 5 }).map((_, i) => (
						<Star
							key={i}
							size={12}
							className={i < (r.rating ?? 0) ? "fill-warn text-warn" : "text-ink-4"}
						/>
					))}
					<span className="ml-1 text-xs text-ink-3">{r.rating ?? "—"}</span>
				</div>
			),
			width: "w-40",
		},
		{
			key: "public",
			header: "Visibility",
			cell: r => (
				<Badge variant={r.isPublic ? "success" : "neutral"}>
					{r.isPublic ? "Public" : "Private"}
				</Badge>
			),
			width: "w-28",
		},
		{
			key: "submitted",
			header: "Submitted",
			cell: r => <span className="text-xs text-ink-3">{fmtDateTime(r.submittedAt)}</span>,
			width: "w-40",
		},
	];

	return (
		<div className="p-6">
			<PageHeader
				title="Feedback"
				description="Collect attendee feedback for sessions and conference experiences."
				actions={
					canEdit ? (
						<Button
							variant="primary"
							leadingIcon={<Plus size={14} />}
							onClick={() => setCreating(true)}
						>
							New feedback
						</Button>
					) : undefined
				}
			/>
			<Card pad="sm">
				<DataTable
					columns={cols}
					rows={rows}
					loading={list.isLoading || attendees.isLoading || sessions.isLoading}
					onRowClick={r => setEditing(r)}
					selectedKey={editing?.id ?? null}
					emptyTitle="No feedback yet"
					emptyHint="Capture session feedback here."
				/>
				<Pagination
					page={search.page ?? 1}
					pageSize={PAGE_SIZE}
					total={total}
					onChange={p => setSearch({ page: p })}
				/>
			</Card>
			{(editing || creating) && (
				<FeedbackDrawer
					feedback={editing}
					onClose={() => {
						setEditing(null);
						setCreating(false);
					}}
					attendees={attendees.data?.data ?? []}
					sessions={sessions.data?.data ?? []}
				/>
			)}
		</div>
	);
}

function FeedbackDrawer({
	feedback,
	onClose,
	attendees,
	sessions,
}: {
	feedback: Feedback | null;
	onClose: () => void;
	attendees: Attendee[];
	sessions: Session[];
}) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const confirm = useConfirm();
	const isEdit = !!feedback;
	const [form, setForm] = useState<Partial<Feedback>>(feedback ?? { isPublic: false });
	const save = useMutation({
		mutationFn: () => {
			const path = `/api/v1/c/${conference.slug}/feedback`;
			const body = {
				attendeeId: form.attendeeId || undefined,
				sessionId: form.sessionId || undefined,
				rating: form.rating,
				comments: form.comments || undefined,
				isPublic: form.isPublic ?? false,
			};
			return isEdit ? api.patch(`${path}/${feedback!.id}`, body) : api.post(path, body);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.feedback(conference.slug) }).catch(
				console.error,
			);
			toast.success(isEdit ? "Feedback updated" : "Feedback created");
			onClose();
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});

	const del = useMutation({
		mutationFn: () => api.del(`/api/v1/c/${conference.slug}/feedback/${feedback!.id}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.feedback(conference.slug) }).catch(
				console.error,
			);
			toast.success("Feedback deleted");
			onClose();
		},
		onError: (e: any) => toast.error("Delete failed", e.message),
	});

	const upd = (p: Partial<Feedback>) => setForm(f => ({ ...f, ...p }));
	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={isEdit ? "Edit feedback" : "New feedback"}
			width="lg"
			footer={
				<>
					<div className={isEdit ? "flex items-center gap-2" : ""}>
						{isEdit && (
							<Button
								variant="danger"
								leadingIcon={<Trash2 size={14} />}
								loading={del.isPending}
								onClick={async () => {
									const ok = await confirm({
										title: `Delete feedback?`,
										description: `This feedback entry will be permanently deleted.`,
										tone: "danger",
										confirmLabel: "Delete",
									});
									if (ok) del.mutate();
								}}
							>
								Delete
							</Button>
						)}
					</div>
					<div className="flex gap-2">
						<Button variant="ghost" onClick={onClose}>
							Cancel
						</Button>
						<Button
							variant="primary"
							loading={save.isPending}
							onClick={() => save.mutate()}
						>
							Save
						</Button>
					</div>
				</>
			}
		>
			<div className="grid grid-cols-2 gap-3">
				<FieldRow label="Attendee">
					<Select
						value={form.attendeeId ?? ""}
						onChange={e => upd({ attendeeId: e.target.value || undefined })}
					>
						<option value="">—</option>
						{attendees.map(a => (
							<option key={a.id} value={a.id}>
								{a.name} ({a.attendeeCode})
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Session">
					<Select
						value={form.sessionId ?? ""}
						onChange={e => upd({ sessionId: e.target.value || undefined })}
					>
						<option value="">—</option>
						{sessions.map(s => (
							<option key={s.id} value={s.id}>
								{s.title}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Rating">
					<Select
						value={form.rating ?? ""}
						onChange={e =>
							upd({ rating: e.target.value ? Number(e.target.value) : undefined })
						}
					>
						{["", 1, 2, 3, 4, 5].map(v => (
							<option key={String(v)} value={v as any}>
								{v === "" ? "—" : v}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Submitted at">
					<Input
						value={
							feedback?.submittedAt
								? fmtDateTime(feedback.submittedAt)
								: "Auto on save"
						}
						disabled
					/>
				</FieldRow>
				<FieldRow label="Comments" className="col-span-2">
					<Textarea
						value={form.comments ?? ""}
						onChange={e => upd({ comments: e.target.value })}
						className="min-h-40"
					/>
				</FieldRow>
				<label className="col-span-2 flex items-center gap-2 text-sm text-ink-2">
					<input
						type="checkbox"
						checked={form.isPublic ?? false}
						onChange={e => upd({ isPublic: e.target.checked })}
						className="size-4 accent-accent"
					/>
					Public feedback
				</label>
			</div>
		</EntityDrawer>
	);
}
