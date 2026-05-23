import { useState } from "react";

import { api } from "@/lib/api";
import { hasRole, useConference } from "@/lib/ConferenceContext";
import { fmtINR, humanise } from "@/lib/format";
import { useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { Tabs } from "@/components/Tabs";
import { useToast } from "@/components/Toast";

const Search = z.object({
	tab: z.enum(["ledger", "sponsors"]).default("ledger").optional(),
	page: z.coerce.number().int().min(1).default(1).optional(),
});

export const Route = createFileRoute("/c/$slug/finance")({
	validateSearch: s => Search.parse(s),
	component: FinancePage,
});

type FinanceItem = {
	id: string;
	title: string;
	category?: string | null;
	direction: "income" | "expense";
	amountPlanned?: string | null;
	amountActual?: string | null;
	notes?: string | null;
};
type Sponsor = {
	id: string;
	name: string;
	tier?: string | null;
	amountCommitted?: string | null;
	amountReceived?: string | null;
	contactName?: string | null;
	contactEmail?: string | null;
};
type Summary = {
	incomePlanned: string;
	incomeActual: string;
	expensePlanned: string;
	expenseActual: string;
};

const PAGE_SIZE = 25;

function FinancePage() {
	const { conference, membership } = useConference();
	const canEdit = hasRole(membership, "editor");
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();
	const tab = search.tab ?? "ledger";

	const summary = useQuery<Summary>({
		queryKey: ["finance-summary", conference.slug],
		queryFn: () => api.get<Summary>(`/api/v1/c/${conference.slug}/finance/summary`),
	});

	const incomeActual = Number(summary.data?.incomeActual ?? 0);
	const expenseActual = Number(summary.data?.expenseActual ?? 0);
	const net = incomeActual - expenseActual;

	return (
		<div className="p-6">
			<PageHeader
				title="Finance & Sponsors"
				description="Budget ledger and sponsorship tracking."
			/>

			<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
				<StatCard
					label="Income (actual)"
					value={fmtINR(incomeActual)}
					icon={<TrendingUp size={18} />}
					tone="success"
					hint={`Planned ${fmtINR(Number(summary.data?.incomePlanned ?? 0))}`}
				/>
				<StatCard
					label="Expense (actual)"
					value={fmtINR(expenseActual)}
					icon={<TrendingDown size={18} />}
					tone="danger"
					hint={`Planned ${fmtINR(Number(summary.data?.expensePlanned ?? 0))}`}
				/>
				<StatCard
					label="Net position"
					value={fmtINR(net)}
					icon={<Wallet size={18} />}
					tone={net >= 0 ? "success" : "danger"}
				/>
			</div>

			<Tabs
				value={tab}
				onValueChange={v => setSearch({ tab: v as any, page: 1 })}
				items={[
					{
						value: "ledger",
						label: "Ledger",
						content: (
							<LedgerTab canEdit={canEdit} search={search} setSearch={setSearch} />
						),
					},
					{
						value: "sponsors",
						label: "Sponsors",
						content: (
							<SponsorsTab canEdit={canEdit} search={search} setSearch={setSearch} />
						),
					},
				]}
			/>
		</div>
	);
}

function LedgerTab({
	canEdit,
	search,
	setSearch,
}: {
	canEdit: boolean;
	search: z.infer<typeof Search>;
	setSearch: (p: Partial<z.infer<typeof Search>>) => void;
}) {
	const { conference } = useConference();
	const list = useListQuery<FinanceItem>({
		key: ["finance-items", conference.slug],
		path: `/api/v1/c/${conference.slug}/finance`,
		params: { page: search.page ?? 1, pageSize: PAGE_SIZE },
	});
	const [editing, setEditing] = useState<FinanceItem | null>(null);
	const [creating, setCreating] = useState(false);

	const cols: Column<FinanceItem>[] = [
		{
			key: "title",
			header: "Item",
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
			key: "direction",
			header: "Type",
			cell: r => (
				<Badge variant={r.direction === "income" ? "success" : "danger"}>
					{r.direction}
				</Badge>
			),
			width: "w-28",
		},
		{
			key: "planned",
			header: "Planned",
			cell: r => fmtINR(Number(r.amountPlanned ?? 0)),
			align: "right",
			width: "w-32",
		},
		{
			key: "actual",
			header: "Actual",
			cell: r => <span className="font-medium">{fmtINR(Number(r.amountActual ?? 0))}</span>,
			align: "right",
			width: "w-32",
		},
	];

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
						Add line item
					</Button>
				)}
			</div>
			<Card pad="sm">
				<DataTable
					columns={cols}
					rows={list.data?.data ?? []}
					loading={list.isLoading}
					onRowClick={r => setEditing(r)}
					selectedKey={editing?.id ?? null}
					emptyTitle="No line items"
				/>
				<Pagination
					page={search.page ?? 1}
					pageSize={PAGE_SIZE}
					total={list.data?.pagination?.total ?? 0}
					onChange={p => setSearch({ page: p })}
				/>
			</Card>
			{(editing || creating) && (
				<FinanceItemDrawer
					item={editing}
					onClose={() => {
						setEditing(null);
						setCreating(false);
					}}
				/>
			)}
		</>
	);
}

function FinanceItemDrawer({ item, onClose }: { item: FinanceItem | null; onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const isEdit = !!item;
	const [form, setForm] = useState<Partial<FinanceItem>>(item ?? { direction: "expense" });
	const save = useMutation({
		mutationFn: () => {
			const path = `/api/v1/c/${conference.slug}/finance`;
			const body = {
				title: form.title,
				category: form.category || undefined,
				direction: form.direction,
				amountPlanned: form.amountPlanned ? String(form.amountPlanned) : undefined,
				amountActual: form.amountActual ? String(form.amountActual) : undefined,
				notes: form.notes || undefined,
			};
			return isEdit ? api.patch(`${path}/${item!.id}`, body) : api.post(path, body);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["finance-items", conference.slug] }).catch(
				console.error,
			);
			qc.invalidateQueries({ queryKey: ["finance-summary", conference.slug] }).catch(
				console.error,
			);
			toast.success("Saved");
			onClose();
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});
	const upd = (p: Partial<FinanceItem>) => setForm(f => ({ ...f, ...p }));
	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={isEdit ? item!.title : "New line item"}
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
						Save
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
				<div className="grid grid-cols-2 gap-3">
					<FieldRow label="Direction">
						<Select
							value={form.direction ?? "expense"}
							onChange={e => upd({ direction: e.target.value as any })}
						>
							<option value="income">Income</option>
							<option value="expense">Expense</option>
						</Select>
					</FieldRow>
					<FieldRow label="Category">
						<Input
							value={form.category ?? ""}
							onChange={e => upd({ category: e.target.value })}
						/>
					</FieldRow>
					<FieldRow label="Planned amount (₹)">
						<Input
							type="number"
							value={form.amountPlanned ?? ""}
							onChange={e => upd({ amountPlanned: e.target.value })}
						/>
					</FieldRow>
					<FieldRow label="Actual amount (₹)">
						<Input
							type="number"
							value={form.amountActual ?? ""}
							onChange={e => upd({ amountActual: e.target.value })}
						/>
					</FieldRow>
				</div>
				<FieldRow label="Notes">
					<Textarea
						value={form.notes ?? ""}
						onChange={e => upd({ notes: e.target.value })}
					/>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}

function SponsorsTab({
	canEdit,
	search,
	setSearch,
}: {
	canEdit: boolean;
	search: z.infer<typeof Search>;
	setSearch: (p: Partial<z.infer<typeof Search>>) => void;
}) {
	const { conference } = useConference();
	const list = useListQuery<Sponsor>({
		key: ["sponsors", conference.slug],
		path: `/api/v1/c/${conference.slug}/sponsors`,
		params: { page: search.page ?? 1, pageSize: PAGE_SIZE },
	});
	const [editing, setEditing] = useState<Sponsor | null>(null);
	const [creating, setCreating] = useState(false);

	const cols: Column<Sponsor>[] = [
		{
			key: "name",
			header: "Sponsor",
			cell: r => (
				<div className="min-w-0">
					<div className="text-ink font-medium truncate">{r.name}</div>
					{r.contactName && (
						<div className="text-xs text-ink-3 truncate">{r.contactName}</div>
					)}
				</div>
			),
		},
		{
			key: "tier",
			header: "Tier",
			cell: r => (
				<Badge variant="accent" className="capitalize">
					{r.tier ?? "—"}
				</Badge>
			),
			width: "w-28",
		},
		{
			key: "committed",
			header: "Committed",
			cell: r => fmtINR(Number(r.amountCommitted ?? 0)),
			align: "right",
			width: "w-32",
		},
		{
			key: "received",
			header: "Received",
			cell: r => <span className="font-medium">{fmtINR(Number(r.amountReceived ?? 0))}</span>,
			align: "right",
			width: "w-32",
		},
	];

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
						Add sponsor
					</Button>
				)}
			</div>
			<Card pad="sm">
				<DataTable
					columns={cols}
					rows={list.data?.data ?? []}
					loading={list.isLoading}
					onRowClick={r => setEditing(r)}
					selectedKey={editing?.id ?? null}
					emptyTitle="No sponsors"
				/>
				<Pagination
					page={search.page ?? 1}
					pageSize={PAGE_SIZE}
					total={list.data?.pagination?.total ?? 0}
					onChange={p => setSearch({ page: p })}
				/>
			</Card>
			{(editing || creating) && (
				<SponsorDrawer
					sponsor={editing}
					onClose={() => {
						setEditing(null);
						setCreating(false);
					}}
				/>
			)}
		</>
	);
}

function SponsorDrawer({ sponsor, onClose }: { sponsor: Sponsor | null; onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const isEdit = !!sponsor;
	const [form, setForm] = useState<Partial<Sponsor>>(sponsor ?? {});
	const save = useMutation({
		mutationFn: () => {
			const path = `/api/v1/c/${conference.slug}/sponsors`;
			const body = {
				name: form.name,
				tier: form.tier || undefined,
				amountCommitted: form.amountCommitted ? String(form.amountCommitted) : undefined,
				amountReceived: form.amountReceived ? String(form.amountReceived) : undefined,
				contactName: form.contactName || undefined,
				contactEmail: form.contactEmail || undefined,
			};
			return isEdit ? api.patch(`${path}/${sponsor!.id}`, body) : api.post(path, body);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["sponsors", conference.slug] }).catch(console.error);
			toast.success("Saved");
			onClose();
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});
	const upd = (p: Partial<Sponsor>) => setForm(f => ({ ...f, ...p }));
	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={isEdit ? sponsor!.name : "New sponsor"}
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
						Save
					</Button>
				</>
			}
		>
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				<FieldRow label="Name" required className="sm:col-span-2">
					<Input value={form.name ?? ""} onChange={e => upd({ name: e.target.value })} />
				</FieldRow>
				<FieldRow label="Tier">
					<Select
						value={form.tier ?? ""}
						onChange={e => upd({ tier: e.target.value || null })}
					>
						<option value="">—</option>
						{["title", "platinum", "gold", "silver", "bronze", "partner"].map(t => (
							<option key={t} value={t}>
								{humanise(t)}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Committed (₹)">
					<Input
						type="number"
						value={form.amountCommitted ?? ""}
						onChange={e => upd({ amountCommitted: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Received (₹)">
					<Input
						type="number"
						value={form.amountReceived ?? ""}
						onChange={e => upd({ amountReceived: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Contact name">
					<Input
						value={form.contactName ?? ""}
						onChange={e => upd({ contactName: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Contact email" className="sm:col-span-2">
					<Input
						type="email"
						value={form.contactEmail ?? ""}
						onChange={e => upd({ contactEmail: e.target.value })}
					/>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}
