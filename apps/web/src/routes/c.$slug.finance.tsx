import { useState } from "react";

import { api } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { fmtINR, humanise } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, Trash2, TrendingDown, TrendingUp, Wallet } from "lucide-react";
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
	itemName: string;
	itemType: string;
	category: string | null;

	budgetAmount: string;
	actualAmount: string;
	currency: string;

	paymentStatus: string;
	vendorOrSource: string | null;
	invoiceNumber: string | null;
	notes: string | null;
};
type Sponsor = {
	id: string;
	name: string;
	tier: string | null;
	contributionAmount: string;
	website: string | null;
	logoFileId: string | null;
	mouFileId: string | null;
	notes: string | null;

	contactName: string | null;
	contactEmail: string | null;
	contactPhone: string | null;
};
type Summary = {
	totalBudget: string;
	totalActual: string;
	incomeBudget: string;
	incomeActual: string;
	expenseBudget: string;
	expenseActual: string;
	count: string;
};

const PAGE_SIZE = 20;

function FinancePage() {
	const { conference, membership } = useConference();
	const canEdit = hasAtLeastRole(membership, "editor");
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();
	const tab = search.tab ?? "ledger";

	const summary = useQuery<{ data: Summary }>({
		queryKey: queryKeys.financeSummary(conference.slug),
		queryFn: () => api.get<{ data: Summary }>(`/api/v1/c/${conference.slug}/finance/summary`),
	});

	const incomeActual = Number(summary.data?.data?.incomeActual ?? 0);
	const expenseActual = Number(summary.data?.data?.expenseActual ?? 0);
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
					value={incomeActual}
					icon={<TrendingUp size={18} />}
					tone="success"
					prefix="₹"
					hint={`Budget ${fmtINR(Number(summary.data?.data?.incomeBudget ?? 0))}`}
				/>
				<StatCard
					label="Expense (actual)"
					value={expenseActual}
					icon={<TrendingDown size={18} />}
					tone="danger"
					prefix="₹"
					hint={`Budget ${fmtINR(Number(summary.data?.data?.expenseBudget ?? 0))}`}
				/>
				<StatCard
					label="Net position"
					value={net}
					icon={<Wallet size={18} />}
					tone={net >= 0 ? "success" : "danger"}
					prefix="₹"
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
			key: "itemName",
			header: "Item",
			cell: r => (
				<div className="min-w-0">
					<div className="text-ink font-medium truncate">{r.itemName}</div>
					{r.category && (
						<div className="text-xs text-ink-3 capitalize">{humanise(r.category)}</div>
					)}
				</div>
			),
		},
		{
			key: "itemType",
			header: "Type",
			cell: r => (
				<Badge variant={r.itemType === "income" ? "success" : "danger"}>
					{humanise(r.itemType)}
				</Badge>
			),
			width: "w-28",
		},
		{
			key: "budgetAmount",
			header: "Budget",
			cell: r => fmtINR(Number(r.budgetAmount ?? 0)),
			width: "w-32",
		},
		{
			key: "actualAmount",
			header: "Actual",
			cell: r => <span className="font-medium">{fmtINR(Number(r.actualAmount ?? 0))}</span>,
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
						Add item
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
	const confirm = useConfirm();
	const isEdit = !!item;
	const [form, setForm] = useState<Partial<FinanceItem>>(
		item ?? ({ itemType: "expense" } as any),
	);
	const save = useMutation({
		mutationFn: () => {
			const path = `/api/v1/c/${conference.slug}/finance`;
			const body = {
				itemName: form.itemName,
				category: form.category || undefined,
				itemType: form.itemType,
				budgetAmount: form.budgetAmount ? String(form.budgetAmount) : undefined,
				actualAmount: form.actualAmount ? String(form.actualAmount) : undefined,
				paymentStatus: form.paymentStatus,
				vendorOrSource: form.vendorOrSource || undefined,
				invoiceNumber: form.invoiceNumber || undefined,
				notes: form.notes || undefined,
			};
			return isEdit ? api.patch(`${path}/${item!.id}`, body) : api.post(path, body);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.financeItems(conference.slug) }).catch(
				console.error,
			);
			qc.invalidateQueries({ queryKey: queryKeys.financeSummary(conference.slug) }).catch(
				console.error,
			);
			toast.success("Saved");
			onClose();
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});

	const del = useMutation({
		mutationFn: () => api.del(`/api/v1/c/${conference.slug}/finance/${item!.id}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.financeItems(conference.slug) }).catch(
				console.error,
			);
			qc.invalidateQueries({ queryKey: queryKeys.financeSummary(conference.slug) }).catch(
				console.error,
			);
			toast.success("Item deleted");
			onClose();
		},
		onError: (e: any) => toast.error("Delete failed", e.message),
	});

	const upd = (p: Partial<FinanceItem>) => setForm(f => ({ ...f, ...p }));
	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={isEdit ? item!.itemName : "New line item"}
			width="md"
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
										title: `Delete line item?`,
										description: `"${item!.itemName}" will be permanently deleted.`,
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
				<FieldRow label="Item name" required>
					<Input
						value={form.itemName ?? ""}
						onChange={e => upd({ itemName: e.target.value })}
					/>
				</FieldRow>
				<div className="grid grid-cols-2 gap-3">
					<FieldRow label="Type">
						<Select
							value={form.itemType ?? "expense"}
							onChange={e => upd({ itemType: e.target.value as any })}
						>
							<option value="income">Income</option>
							<option value="expense">Expense</option>
						</Select>
					</FieldRow>
					<FieldRow label="Category">
						<Select
							value={form.category ?? ""}
							onChange={e => upd({ category: e.target.value as any })}
						>
							<option value="">—</option>
							{[
								"registration",
								"sponsorship",
								"accommodation",
								"food",
								"transport",
								"printing",
								"venue_av",
								"vip_event",
								"logistics",
								"honorarium",
								"misc",
							].map(c => (
								<option key={c} value={c}>
									{humanise(c)}
								</option>
							))}
						</Select>
					</FieldRow>
					<FieldRow label="Budget amount (₹)">
						<Input
							type="number"
							value={form.budgetAmount ?? ""}
							onChange={e => upd({ budgetAmount: e.target.value })}
						/>
					</FieldRow>
					<FieldRow label="Actual amount (₹)">
						<Input
							type="number"
							value={form.actualAmount ?? ""}
							onChange={e => upd({ actualAmount: e.target.value })}
						/>
					</FieldRow>
				</div>
				<FieldRow label="Payment status">
					<Select
						value={form.paymentStatus ?? "pending"}
						onChange={e => upd({ paymentStatus: e.target.value })}
					>
						{["pending", "partial", "paid", "received", "cancelled", "refunded"].map(
							s => (
								<option key={s} value={s}>
									{humanise(s)}
								</option>
							),
						)}
					</Select>
				</FieldRow>
				<FieldRow label="Vendor / source">
					<Input
						value={form.vendorOrSource ?? ""}
						onChange={e => upd({ vendorOrSource: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Invoice number">
					<Input
						value={form.invoiceNumber ?? ""}
						onChange={e => upd({ invoiceNumber: e.target.value })}
					/>
				</FieldRow>
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
			key: "contribution",
			header: "Contribution",
			cell: r => fmtINR(Number(r.contributionAmount ?? 0)),
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
				contributionAmount: form.contributionAmount
					? String(form.contributionAmount)
					: undefined,
				contactName: form.contactName || undefined,
				contactEmail: form.contactEmail || undefined,
				contactPhone: form.contactPhone || undefined,
			};
			return isEdit ? api.patch(`${path}/${sponsor!.id}`, body) : api.post(path, body);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.sponsors(conference.slug) }).catch(
				console.error,
			);
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
				<FieldRow label="Contribution (₹)">
					<Input
						type="number"
						value={form.contributionAmount ?? ""}
						onChange={e => upd({ contributionAmount: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Contact name">
					<Input
						value={form.contactName ?? ""}
						onChange={e => upd({ contactName: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Contact email">
					<Input
						type="email"
						value={form.contactEmail ?? ""}
						onChange={e => upd({ contactEmail: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Contact phone">
					<Input
						value={form.contactPhone ?? ""}
						onChange={e => upd({ contactPhone: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Website" className="sm:col-span-2">
					<Input
						type="url"
						value={form.website ?? ""}
						onChange={e => upd({ website: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Notes" className="sm:col-span-2">
					<Textarea
						value={form.notes ?? ""}
						onChange={e => upd({ notes: e.target.value })}
					/>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}
