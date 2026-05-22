import { useState } from "react";

import { hasRole, useConference } from "@/lib/ConferenceContext";
import { fmtDateTime, humanise, initials } from "@/lib/format";
import type { BadgeVariant } from "@/lib/uiStyles";
import { useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, History } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/Badge";
import { Card } from "@/components/Card";
import { Pagination } from "@/components/DataTable";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";
import { Input, Select } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { Toolbar } from "@/components/Toolbar";

const Search = z.object({
	page: z.coerce.number().int().min(1).default(1).optional(),
	action: z.string().optional(),
	entity: z.string().optional(),
	from: z.string().optional(),
	to: z.string().optional(),
});

export const Route = createFileRoute("/c/$slug/audit")({
	validateSearch: s => Search.parse(s),
	component: AuditPage,
});

type AuditEntry = {
	id: string;
	action: string;
	entity: string;
	entityId?: string | null;
	actorName?: string | null;
	actorEmail?: string | null;
	summary?: string | null;
	changes?: Record<string, { from: unknown; to: unknown }> | null;
	ipAddress?: string | null;
	createdAt: string;
};

const PAGE_SIZE = 40;

const ACTION_VARIANT: Record<string, BadgeVariant> = {
	create: "success",
	update: "info",
	delete: "danger",
	purge: "danger",
	login: "neutral",
	bulk_action: "warn",
	import: "accent",
	export: "accent",
};

function actionVariant(action: string): BadgeVariant {
	for (const [k, v] of Object.entries(ACTION_VARIANT)) {
		if (action.includes(k)) return v;
	}
	return "neutral";
}

function AuditPage() {
	const { conference, membership } = useConference();
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();

	const list = useListQuery<AuditEntry>({
		key: ["audit", conference.slug],
		path: `/api/v1/c/${conference.slug}/audit`,
		params: {
			page: search.page ?? 1,
			pageSize: PAGE_SIZE,
			action: search.action,
			entity: search.entity,
			from: search.from,
			to: search.to,
		},
		staleTime: 5000,
	});

	if (!hasRole(membership, "admin")) {
		return (
			<div className="p-6">
				<PageHeader title="Audit log" />
				<Card>
					<EmptyState
						title="Admin access required"
						hint="The audit log is visible to admins and super-admins only."
					/>
				</Card>
			</div>
		);
	}

	const rows = list.data?.data ?? [];

	return (
		<div className="p-6">
			<PageHeader
				title="Audit log"
				description="A complete, immutable record of every change made in this conference."
			/>

			<Card pad="sm">
				<Toolbar
					left={
						<>
							<Select
								value={search.entity ?? ""}
								onChange={e =>
									setSearch({ entity: e.target.value || undefined, page: 1 })
								}
								className="w-44"
							>
								<option value="">All entities</option>
								{[
									"attendee",
									"staff",
									"travel_segment",
									"room_allocation",
									"helpdesk_issue",
									"message_campaign",
									"import_job",
									"conference_member",
									"custom_field",
									"app_setting",
								].map(e => (
									<option key={e} value={e}>
										{humanise(e)}
									</option>
								))}
							</Select>
							<Select
								value={search.action ?? ""}
								onChange={e =>
									setSearch({ action: e.target.value || undefined, page: 1 })
								}
								className="w-40"
							>
								<option value="">All actions</option>
								{[
									"create",
									"update",
									"delete",
									"purge",
									"bulk_action",
									"import",
									"export",
									"login",
								].map(a => (
									<option key={a} value={a}>
										{humanise(a)}
									</option>
								))}
							</Select>
							<Input
								type="date"
								value={search.from ?? ""}
								onChange={e =>
									setSearch({ from: e.target.value || undefined, page: 1 })
								}
								className="w-40"
							/>
							<Input
								type="date"
								value={search.to ?? ""}
								onChange={e =>
									setSearch({ to: e.target.value || undefined, page: 1 })
								}
								className="w-40"
							/>
						</>
					}
				/>

				{list.isLoading && <CenterSpinner />}
				{!list.isLoading && rows.length === 0 && (
					<EmptyState
						icon={<History size={24} />}
						title="No audit entries"
						hint="Try widening the filters."
					/>
				)}

				<div className="divide-y divide-line">
					{rows.map(entry => (
						<AuditRow key={entry.id} entry={entry} />
					))}
				</div>

				<Pagination
					page={search.page ?? 1}
					pageSize={PAGE_SIZE}
					total={list.data?.total ?? 0}
					onChange={p => setSearch({ page: p })}
				/>
			</Card>
		</div>
	);
}

function AuditRow({ entry }: { entry: AuditEntry }) {
	const [expanded, setExpanded] = useState(false);
	const hasChanges = entry.changes && Object.keys(entry.changes).length > 0;

	return (
		<div className="py-3">
			<div className="flex items-start gap-3">
				<div className="size-8 rounded-full bg-surface-2 border border-line flex items-center justify-center text-[10px] font-semibold text-ink-2 shrink-0">
					{initials(entry.actorName ?? "—")}
				</div>
				<div className="min-w-0 flex-1">
					<div className="flex items-center gap-2 flex-wrap">
						<Badge variant={actionVariant(entry.action)} size="sm">
							{humanise(entry.action)}
						</Badge>
						<span className="text-sm text-ink">
							<b>{entry.actorName ?? "System"}</b>{" "}
							<span className="text-ink-3">
								{entry.summary ??
									`${humanise(entry.action)} on ${humanise(entry.entity)}`}
							</span>
						</span>
					</div>
					<div className="mt-0.5 text-xs text-ink-3">
						{fmtDateTime(entry.createdAt)}
						{entry.entityId && (
							<>
								{" · "}
								<span className="font-mono">
									{entry.entity}:{entry.entityId.slice(0, 8)}
								</span>
							</>
						)}
						{entry.ipAddress && <> · {entry.ipAddress}</>}
					</div>
					{hasChanges && (
						<>
							<button
								onClick={() => setExpanded(s => !s)}
								className="mt-1 inline-flex items-center gap-1 text-xs text-accent hover:underline"
							>
								{expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
								{Object.keys(entry.changes!).length} field change(s)
							</button>
							{expanded && (
								<div className="mt-2 rounded-md border border-line bg-surface-2 divide-y divide-line">
									{Object.entries(entry.changes!).map(([field, diff]) => (
										<div key={field} className="px-3 py-1.5 text-xs">
											<span className="font-mono text-ink-2">{field}</span>
											<div className="mt-0.5 flex items-center gap-2">
												<span className="text-danger-soft-fg line-through truncate max-w-[40%]">
													{fmtVal(diff.from)}
												</span>
												<span className="text-ink-3">→</span>
												<span className="text-success-soft-fg truncate max-w-[40%]">
													{fmtVal(diff.to)}
												</span>
											</div>
										</div>
									))}
								</div>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function fmtVal(v: unknown): string {
	if (v === null || v === undefined) return "∅";
	if (typeof v === "object") return JSON.stringify(v);
	return String(v);
}
