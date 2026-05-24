import { useState } from "react";

import { api } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { fmtRelative, humanise } from "@/lib/format";
import type { BadgeVariant } from "@/lib/uiStyles";
import { useListQuery } from "@/lib/useListQuery";
import { useRealtime } from "@/lib/useRealtime";
import { useUrlState } from "@/lib/useUrlState";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { z } from "zod";

import { Badge, StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { SearchField } from "@/components/SearchField";
import { useToast } from "@/components/Toast";

const Search = z.object({
	q: z.string().optional(),
	page: z.coerce.number().int().min(1).default(1).optional(),
	status: z.string().optional(),
	priority: z.string().optional(),
	category: z.string().optional(),
});

export const Route = createFileRoute("/c/$slug/helpdesk")({
	validateSearch: s => Search.parse(s),
	component: HelpdeskPage,
});

type Issue = {
	id: string;
	issueCode: string;
	title: string;
	description?: string | null;
	category?: string | null;
	priority: string;
	status: string;
	attendeeId?: string | null;
	assignedToStaffId?: string | null;
	assignedCommitteeId?: string | null;
	resolutionNotes?: string | null;
	createdAt: string;
	resolvedAt?: string | null;
};

const PAGE_SIZE = 20;

const PRIORITY_VARIANT: Record<string, BadgeVariant> = {
	low: "neutral",
	medium: "info",
	high: "warn",
	urgent: "danger",
};

function HelpdeskPage() {
	const { conference, membership } = useConference();
	const canEdit = hasAtLeastRole(membership, "editor");
	const qc = useQueryClient();
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();

	const list = useListQuery<Issue>({
		key: ["helpdesk", conference.slug],
		path: `/api/v1/c/${conference.slug}/helpdesk`,
		params: {
			page: search.page ?? 1,
			pageSize: PAGE_SIZE,
			q: search.q,
			status: search.status,
			priority: search.priority,
			category: search.category,
		},
	});

	useRealtime(conference.slug, ev => {
		if (ev.type.startsWith("helpdesk.")) {
			qc.invalidateQueries({ queryKey: ["helpdesk", conference.slug] }).catch(console.error);
		}
	});

	const [open, setOpen] = useState<Issue | null>(null);
	const [createOpen, setCreateOpen] = useState(false);

	const rows = list.data?.data ?? [];
	const total = list.data?.pagination?.total ?? 0;

	const cols: Column<Issue>[] = [
		{
			key: "code",
			header: "Code",
			cell: r => <span className="font-mono text-[11px] text-ink-2">{r.issueCode}</span>,
			width: "w-28",
		},
		{
			key: "title",
			header: "Issue",
			cell: r => (
				<div className="min-w-0">
					<div className="text-ink font-medium truncate">{r.title}</div>
					{r.category && (
						<div className="text-xs text-ink-3 capitalize">{humanise(r.category)}</div>
					)}
				</div>
			),
		},
		{
			key: "priority",
			header: "Priority",
			cell: r => (
				<Badge variant={PRIORITY_VARIANT[r.priority] ?? "neutral"} className="capitalize">
					{r.priority}
				</Badge>
			),
			width: "w-28",
		},
		{
			key: "status",
			header: "Status",
			cell: r => <StatusBadge status={r.status} />,
			width: "w-32",
		},
		{
			key: "age",
			header: "Raised",
			cell: r => <span className="text-xs text-ink-3">{fmtRelative(r.createdAt)}</span>,
			width: "w-32",
		},
	];

	return (
		<div className="p-6">
			<PageHeader
				title="Helpdesk"
				description="Track and resolve on-ground issues raised during the conference."
				actions={
					canEdit && (
						<Button
							variant="primary"
							leadingIcon={<Plus size={14} />}
							onClick={() => setCreateOpen(true)}
						>
							New issue
						</Button>
					)
				}
			/>

			<Card pad="sm">
				<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-4">
					<SearchField
						value={search.q ?? ""}
						onChange={q => setSearch({ q, page: 1 })}
						placeholder="Search issues..."
						className="min-w-60 md:col-span-2 lg:col-span-1"
					/>
					<Select
						value={search.status ?? ""}
						onChange={e => setSearch({ status: e.target.value || undefined, page: 1 })}
						className="w-40"
					>
						<option value="">Any status</option>
						{["open", "in_progress", "resolved", "closed"].map(s => (
							<option key={s} value={s}>
								{humanise(s)}
							</option>
						))}
					</Select>
					<Select
						value={search.priority ?? ""}
						onChange={e =>
							setSearch({ priority: e.target.value || undefined, page: 1 })
						}
						className="w-36"
					>
						<option value="">Any priority</option>
						{["low", "medium", "high", "urgent"].map(s => (
							<option key={s} value={s}>
								{humanise(s)}
							</option>
						))}
					</Select>
				</div>

				<DataTable
					columns={cols}
					rows={rows}
					loading={list.isLoading}
					onRowClick={r => setOpen(r)}
					selectedKey={open?.id ?? null}
					emptyTitle="No issues"
					emptyHint="A quiet helpdesk is a good sign."
				/>
				<Pagination
					page={search.page ?? 1}
					pageSize={PAGE_SIZE}
					total={total}
					onChange={p => setSearch({ page: p })}
				/>
			</Card>

			{open && <IssueDrawer issue={open} canEdit={canEdit} onClose={() => setOpen(null)} />}
			{createOpen && <CreateIssueDrawer onClose={() => setCreateOpen(false)} />}
		</div>
	);
}

function IssueDrawer({
	issue,
	canEdit,
	onClose,
}: {
	issue: Issue;
	canEdit: boolean;
	onClose: () => void;
}) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const [notes, setNotes] = useState(issue.resolutionNotes ?? "");

	const transition = useMutation({
		mutationFn: (status: string) =>
			api.post(`/api/v1/c/${conference.slug}/helpdesk/${issue.id}/transition`, {
				status,
				resolutionNotes: notes || undefined,
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["helpdesk", conference.slug] }).catch(console.error);
			qc.invalidateQueries({ queryKey: ["dashboard", conference.slug] }).catch(console.error);
			toast.success("Issue updated");
			onClose();
		},
		onError: (e: any) => toast.error("Update failed", e.message),
	});

	const NEXT: Record<string, { to: string; label: string }[]> = {
		open: [{ to: "in_progress", label: "Start working" }],
		in_progress: [
			{ to: "resolved", label: "Mark resolved" },
			{ to: "open", label: "Re-open" },
		],
		resolved: [
			{ to: "closed", label: "Close" },
			{ to: "in_progress", label: "Re-open" },
		],
		closed: [{ to: "in_progress", label: "Re-open" }],
	};

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={issue.title}
			subtitle={issue.issueCode}
			status={
				<div className="flex gap-2">
					<StatusBadge status={issue.status} />
					<Badge
						variant={PRIORITY_VARIANT[issue.priority] ?? "neutral"}
						className="capitalize"
					>
						{issue.priority}
					</Badge>
				</div>
			}
			width="md"
			footer={
				canEdit && (
					<div className="flex gap-2">
						{(NEXT[issue.status] ?? []).map(t => (
							<Button
								key={t.to}
								variant={
									t.to === "resolved" || t.to === "closed"
										? "primary"
										: "secondary"
								}
								loading={transition.isPending}
								onClick={() => transition.mutate(t.to)}
							>
								{t.label}
							</Button>
						))}
					</div>
				)
			}
		>
			<div className="space-y-4">
				{issue.description && (
					<div>
						<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 mb-1">
							Description
						</div>
						<p className="text-sm text-ink-2 whitespace-pre-wrap">
							{issue.description}
						</p>
					</div>
				)}
				<div className="grid grid-cols-2 gap-3 text-sm">
					<div>
						<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
							Category
						</div>
						<div className="text-ink mt-0.5 capitalize">
							{humanise(issue.category) || "—"}
						</div>
					</div>
					<div>
						<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
							Raised
						</div>
						<div className="text-ink mt-0.5">{fmtRelative(issue.createdAt)}</div>
					</div>
				</div>
				<FieldRow label="Resolution notes">
					<Textarea
						value={notes}
						onChange={e => setNotes(e.target.value)}
						placeholder="What was done to resolve this?"
						disabled={!canEdit}
					/>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}

function CreateIssueDrawer({ onClose }: { onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const [form, setForm] = useState({
		title: "",
		description: "",
		category: "other",
		priority: "medium",
	});
	const create = useMutation({
		mutationFn: () => api.post(`/api/v1/c/${conference.slug}/helpdesk`, form),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["helpdesk", conference.slug] }).catch(console.error);
			toast.success("Issue created");
			onClose();
		},
		onError: (e: any) => toast.error("Create failed", e.message),
	});
	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title="New helpdesk issue"
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
						Create
					</Button>
				</>
			}
		>
			<div className="space-y-4">
				<FieldRow label="Title" required>
					<Input
						value={form.title}
						onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
						placeholder="Short summary"
					/>
				</FieldRow>
				<FieldRow label="Description">
					<Textarea
						value={form.description}
						onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
					/>
				</FieldRow>
				<div className="grid grid-cols-2 gap-3">
					<FieldRow label="Category">
						<Select
							value={form.category}
							onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
						>
							{[
								"transport",
								"accommodation",
								"food",
								"badge",
								"technical",
								"lost_item",
								"medical",
								"vip",
								"registration",
								"other",
							].map(c => (
								<option key={c} value={c}>
									{humanise(c)}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="Priority">
						<Select
							value={form.priority}
							onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}
						>
							{["low", "medium", "high", "urgent"].map(c => (
								<option key={c} value={c}>
									{humanise(c)}
								</option>
							))}
						</Select>
					</FieldRow>
				</div>
			</div>
		</EntityDrawer>
	);
}
