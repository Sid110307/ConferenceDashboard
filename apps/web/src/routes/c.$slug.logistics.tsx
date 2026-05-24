import { useState } from "react";

import { api } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { fmtINR, humanise } from "@/lib/format";
import { useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

const Search = z.object({
	page: z.coerce.number().int().min(1).default(1).optional(),
});

export const Route = createFileRoute("/c/$slug/logistics")({
	validateSearch: s => Search.parse(s),
	component: LogisticsPage,
});

type LogisticsItem = {
	id: string;
	itemName: string;
	category: string;
	totalQuantity: number;
	issuedQuantity: number;
	vendorName?: string | null;
	vendorContact?: string | null;
	unitCost?: string | null;
	currency: string;
	status: string;
	notes?: string | null;
	createdAt: string;
};

const PAGE_SIZE = 20;
const CATEGORIES = [
	"kit",
	"printing",
	"av",
	"transport",
	"food",
	"venue",
	"certificate",
	"misc",
] as const;
const STATUSES = ["pending", "ordered", "received", "issued", "shortage", "cancelled"] as const;

function LogisticsPage() {
	const { membership, conference } = useConference();
	const canEdit = hasAtLeastRole(membership, "editor");
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();
	const list = useListQuery<LogisticsItem>({
		key: ["logistics", conference.slug],
		path: `/api/v1/c/${conference.slug}/logistics`,
		params: { page: search.page, pageSize: PAGE_SIZE },
	});
	const rows = list.data?.data ?? [];
	const total = list.data?.pagination?.total ?? 0;
	const [editing, setEditing] = useState<LogisticsItem | null>(null);
	const [creating, setCreating] = useState(false);

	const cols: Column<LogisticsItem>[] = [
		{
			key: "item",
			header: "Item",
			cell: r => <div className="text-ink font-medium">{r.itemName}</div>,
		},
		{
			key: "category",
			header: "Category",
			cell: r => <Badge className="capitalize">{humanise(r.category)}</Badge>,
			width: "w-28",
		},
		{
			key: "qty",
			header: "Qty",
			cell: r => `${r.issuedQuantity}/${r.totalQuantity}`,
			width: "w-28",
		},
		{
			key: "status",
			header: "Status",
			cell: r => (
				<Badge
					variant={
						r.status === "shortage"
							? "danger"
							: r.status === "received" || r.status === "issued"
								? "success"
								: "neutral"
					}
					className="capitalize"
				>
					{humanise(r.status)}
				</Badge>
			),
			width: "w-32",
		},
		{
			key: "vendor",
			header: "Vendor",
			cell: r => (
				<div className="text-xs text-ink-2">
					{r.vendorName ?? "—"}
					<div className="text-ink-3">{r.vendorContact ?? ""}</div>
				</div>
			),
		},
		{
			key: "cost",
			header: "Unit cost",
			cell: r => (r.unitCost ? fmtINR(Number(r.unitCost)) : "—"),
			width: "w-28",
		},
	];

	return (
		<div className="p-6">
			<PageHeader
				title="Logistics"
				description="Track kits, printing, AV, venue and transport items with quantities."
				actions={
					canEdit ? (
						<Button
							variant="primary"
							leadingIcon={<Plus size={14} />}
							onClick={() => setCreating(true)}
						>
							New item
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
					emptyTitle="No logistics items yet"
					emptyHint="Add stock and issue tracking here."
				/>
				<Pagination
					page={search.page ?? 1}
					pageSize={PAGE_SIZE}
					total={total}
					onChange={p => setSearch({ page: p })}
				/>
			</Card>
			{(editing || creating) && (
				<LogisticsDrawer
					item={editing}
					onClose={() => {
						setEditing(null);
						setCreating(false);
					}}
				/>
			)}
		</div>
	);
}

function LogisticsDrawer({ item, onClose }: { item: LogisticsItem | null; onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const isEdit = !!item;
	const [form, setForm] = useState<Partial<LogisticsItem>>(
		item ?? {
			category: "misc",
			totalQuantity: 0,
			issuedQuantity: 0,
			status: "pending",
			currency: "INR",
		},
	);
	const save = useMutation({
		mutationFn: () => {
			const path = `/api/v1/c/${conference.slug}/logistics`;
			const body = {
				itemName: form.itemName,
				category: form.category,
				totalQuantity: form.totalQuantity,
				issuedQuantity: form.issuedQuantity,
				vendorName: form.vendorName || undefined,
				vendorContact: form.vendorContact || undefined,
				unitCost: form.unitCost || undefined,
				currency: form.currency,
				status: form.status,
				notes: form.notes || undefined,
			};
			return isEdit ? api.patch(`${path}/${item!.id}`, body) : api.post(path, body);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["logistics", conference.slug] }).catch(console.error);
			toast.success(isEdit ? "Logistics item updated" : "Logistics item created");
			onClose();
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});
	const upd = (p: Partial<LogisticsItem>) => setForm(f => ({ ...f, ...p }));
	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={isEdit ? item!.itemName : "New logistics item"}
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
						Save
					</Button>
				</>
			}
		>
			<div className="grid grid-cols-2 gap-3">
				<FieldRow label="Item name" required className="col-span-2">
					<Input
						value={form.itemName ?? ""}
						onChange={e => upd({ itemName: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Category">
					<Select
						value={form.category ?? "misc"}
						onChange={e => upd({ category: e.target.value })}
					>
						{CATEGORIES.map(c => (
							<option key={c} value={c}>
								{humanise(c)}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Status">
					<Select
						value={form.status ?? "pending"}
						onChange={e => upd({ status: e.target.value })}
					>
						{STATUSES.map(s => (
							<option key={s} value={s}>
								{humanise(s)}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Total quantity">
					<Input
						type="number"
						value={form.totalQuantity ?? 0}
						onChange={e => upd({ totalQuantity: Number(e.target.value) })}
					/>
				</FieldRow>
				<FieldRow label="Issued quantity">
					<Input
						type="number"
						value={form.issuedQuantity ?? 0}
						onChange={e => upd({ issuedQuantity: Number(e.target.value) })}
					/>
				</FieldRow>
				<FieldRow label="Vendor name">
					<Input
						value={form.vendorName ?? ""}
						onChange={e => upd({ vendorName: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Vendor contact">
					<Input
						value={form.vendorContact ?? ""}
						onChange={e => upd({ vendorContact: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Unit cost">
					<Input
						type="number"
						value={form.unitCost ?? ""}
						onChange={e => upd({ unitCost: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Currency">
					<Input
						value={form.currency ?? "INR"}
						onChange={e => upd({ currency: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Notes" className="col-span-2">
					<Textarea
						value={form.notes ?? ""}
						onChange={e => upd({ notes: e.target.value })}
					/>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}
