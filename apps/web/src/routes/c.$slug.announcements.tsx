import { useState } from "react";

import { api } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { fmtDateTime, humanise } from "@/lib/format";
import { useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2 } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useConfirm } from "@/components/ConfirmDialog";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { DatePickerInput } from "@/components/DatePicker";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

const Search = z.object({
	page: z.coerce.number().int().min(1).default(1).optional(),
});

export const Route = createFileRoute("/c/$slug/announcements")({
	validateSearch: s => Search.parse(s),
	component: AnnouncementsPage,
});

type Announcement = {
	id: string;
	title: string;
	message: string;
	priority: string;
	visibleFrom?: string | null;
	visibleUntil?: string | null;
	isPublic: boolean;
	isPinned: boolean;
	sortOrder: number;
	createdAt: string;
};

const PAGE_SIZE = 20;
const PRIORITIES = ["low", "medium", "high", "urgent"] as const;

function AnnouncementsPage() {
	const { membership } = useConference();
	const canEdit = hasAtLeastRole(membership, "editor");
	const { conference } = useConference();
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();
	const list = useListQuery<Announcement>({
		key: ["announcements", conference.slug],
		path: `/api/v1/c/${conference.slug}/announcements`,
		params: { page: search.page, pageSize: PAGE_SIZE },
	});
	const rows = list.data?.data ?? [];
	const total = list.data?.pagination?.total ?? 0;
	const [editing, setEditing] = useState<Announcement | null>(null);
	const [creating, setCreating] = useState(false);

	const cols: Column<Announcement>[] = [
		{
			key: "title",
			header: "Announcement",
			cell: r => (
				<div className="min-w-0">
					<div className="text-ink font-medium truncate">{r.title}</div>
					<div className="text-xs text-ink-3 line-clamp-1">{r.message}</div>
				</div>
			),
		},
		{
			key: "priority",
			header: "Priority",
			cell: r => <Badge className="capitalize">{humanise(r.priority)}</Badge>,
			width: "w-28",
		},
		{
			key: "visibility",
			header: "Visibility",
			cell: r => (
				<div className="text-xs text-ink-2">
					<div>{r.visibleFrom ? `From ${fmtDateTime(r.visibleFrom)}` : "Always"}</div>
					<div>{r.visibleUntil ? `Until ${fmtDateTime(r.visibleUntil)}` : "No end"}</div>
				</div>
			),
			width: "w-64",
		},
		{
			key: "flags",
			header: "Flags",
			cell: r => (
				<div className="flex flex-wrap gap-1.5">
					<Badge variant={r.isPublic ? "success" : "neutral"} size="xs">
						{r.isPublic ? "Public" : "Private"}
					</Badge>
					<Badge variant={r.isPinned ? "accent" : "neutral"} size="xs">
						{r.isPinned ? "Pinned" : "Unpinned"}
					</Badge>
				</div>
			),
			width: "w-40",
		},
	];

	return (
		<div className="p-6">
			<PageHeader
				title="Announcements"
				description="Create pinned or time-bound announcements for attendees and staff."
				actions={
					canEdit ? (
						<Button
							variant="primary"
							leadingIcon={<Plus size={14} />}
							onClick={() => setCreating(true)}
						>
							New announcement
						</Button>
					) : undefined
				}
			/>
			<Card pad="sm">
				<DataTable
					columns={cols}
					rows={rows}
					loading={list.isLoading}
					onRowClick={r => setEditing(r)}
					selectedKey={editing?.id ?? null}
					emptyTitle="No announcements yet"
					emptyHint="Create announcements to share important information."
				/>
				<Pagination
					page={search.page ?? 1}
					pageSize={PAGE_SIZE}
					total={total}
					onChange={p => setSearch({ page: p })}
				/>
			</Card>
			{(editing || creating) && (
				<AnnouncementDrawer
					announcement={editing}
					onClose={() => {
						setEditing(null);
						setCreating(false);
					}}
				/>
			)}
		</div>
	);
}

function AnnouncementDrawer({
	announcement,
	onClose,
}: {
	announcement: Announcement | null;
	onClose: () => void;
}) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const confirm = useConfirm();
	const isEdit = !!announcement;
	const [form, setForm] = useState<Partial<Announcement>>(
		announcement ?? { priority: "medium", isPublic: true, isPinned: false, sortOrder: 0 },
	);

	const save = useMutation({
		mutationFn: () => {
			const path = `/api/v1/c/${conference.slug}/announcements`;
			const body = {
				title: form.title,
				message: form.message,
				priority: form.priority,
				visibleFrom: form.visibleFrom || undefined,
				visibleUntil: form.visibleUntil || undefined,
				isPublic: form.isPublic,
				isPinned: form.isPinned,
				sortOrder: form.sortOrder,
			};
			return isEdit ? api.patch(`${path}/${announcement!.id}`, body) : api.post(path, body);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["announcements", conference.slug] }).catch(
				console.error,
			);
			toast.success(isEdit ? "Announcement updated" : "Announcement created");
			onClose();
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});

	const del = useMutation({
		mutationFn: () => api.del(`/api/v1/c/${conference.slug}/announcements/${announcement!.id}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["announcements", conference.slug] }).catch(
				console.error,
			);
			toast.success("Announcement deleted");
			onClose();
		},
		onError: (e: any) => toast.error("Delete failed", e.message),
	});

	const upd = (p: Partial<Announcement>) => setForm(f => ({ ...f, ...p }));

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={isEdit ? announcement!.title : "New announcement"}
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
										title: `Delete announcement?`,
										description: `"${announcement!.title}" will be permanently deleted.`,
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
			<div className="space-y-4">
				<FieldRow label="Title" required>
					<Input
						value={form.title ?? ""}
						onChange={e => upd({ title: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Message" required>
					<Textarea
						value={form.message ?? ""}
						onChange={e => upd({ message: e.target.value })}
						className="min-h-40"
					/>
				</FieldRow>
				<div className="grid grid-cols-2 gap-3">
					<FieldRow label="Priority">
						<Select
							value={form.priority ?? "medium"}
							onChange={e => upd({ priority: e.target.value as any })}
						>
							{PRIORITIES.map(p => (
								<option key={p} value={p}>
									{humanise(p)}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="Sort order">
						<Input
							type="number"
							value={form.sortOrder ?? 0}
							onChange={e => upd({ sortOrder: Number(e.target.value) })}
						/>
					</FieldRow>
					<FieldRow label="Visible from">
						<DatePickerInput
							mode="datetime"
							value={form.visibleFrom ?? undefined}
							onChange={value => upd({ visibleFrom: value })}
						/>
					</FieldRow>
					<FieldRow label="Visible until">
						<DatePickerInput
							mode="datetime"
							value={form.visibleUntil ?? undefined}
							onChange={value => upd({ visibleUntil: value })}
						/>
					</FieldRow>
				</div>
				<div className="flex items-center gap-4">
					<label className="flex items-center gap-2 text-sm text-ink-2">
						<input
							type="checkbox"
							checked={form.isPublic ?? false}
							onChange={e => upd({ isPublic: e.target.checked })}
							className="size-4 accent-accent"
						/>
						Public
					</label>
					<label className="flex items-center gap-2 text-sm text-ink-2">
						<input
							type="checkbox"
							checked={form.isPinned ?? false}
							onChange={e => upd({ isPinned: e.target.checked })}
							className="size-4 accent-accent"
						/>
						Pinned
					</label>
				</div>
			</div>
		</EntityDrawer>
	);
}
