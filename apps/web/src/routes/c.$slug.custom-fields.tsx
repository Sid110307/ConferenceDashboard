import { useState } from "react";

import { api } from "@/lib/api";
import { hasRole, useConference } from "@/lib/ConferenceContext";
import { humanise } from "@/lib/format";
import { useUrlState } from "@/lib/useUrlState";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { GripVertical, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useConfirm } from "@/components/ConfirmDialog";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

const Search = z.object({
	entity: z.string().default("attendees").optional(),
});

export const Route = createFileRoute("/c/$slug/custom-fields")({
	validateSearch: s => Search.parse(s),
	component: CustomFieldsPage,
});

type FieldDef = {
	id: string;
	entity: string;
	fieldKey: string;
	label: string;
	fieldType: string;
	isRequired: boolean;
	isActive: boolean;
	options?: string[] | null;
	helpText?: string | null;
	displayOrder: number;
};

const ENTITIES = [
	{ value: "attendees", label: "Attendees" },
	{ value: "staff", label: "Staff" },
	{ value: "travel_segments", label: "Travel segments" },
	{ value: "vip_guests", label: "VIP guests" },
	{ value: "helpdesk_issues", label: "Helpdesk issues" },
];

const FIELD_TYPES = [
	"text",
	"textarea",
	"email",
	"phone",
	"url",
	"number",
	"checkbox",
	"date",
	"datetime",
	"select",
	"multiselect",
];

const HAS_OPTIONS = new Set(["select", "multiselect"]);

function CustomFieldsPage() {
	const { conference, membership } = useConference();
	const canAdmin = hasRole(membership, "admin");
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();
	const entity = search.entity ?? "attendees";
	const qc = useQueryClient();
	const toast = useToast();
	const confirm = useConfirm();

	const fields = useQuery<{ data: FieldDef[] }>({
		queryKey: ["custom-fields", conference.slug, entity],
		queryFn: () =>
			api.get<{ data: FieldDef[] }>(`/api/v1/c/${conference.slug}/custom-fields`, {
				entity,
				includeInactive: true,
			}),
	});

	const [editing, setEditing] = useState<FieldDef | null>(null);
	const [creating, setCreating] = useState(false);

	const del = useMutation({
		mutationFn: (id: string) => api.del(`/api/v1/c/${conference.slug}/custom-fields/${id}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["custom-fields", conference.slug, entity] });
			toast.success("Field deleted");
		},
		onError: (e: any) => toast.error("Delete failed", e.message),
	});

	return (
		<div className="p-6">
			<PageHeader
				title="Custom Fields"
				description="Extend core records with conference-specific data fields."
				actions={
					canAdmin && (
						<Button
							variant="primary"
							leadingIcon={<Plus size={14} />}
							onClick={() => setCreating(true)}
						>
							New field
						</Button>
					)
				}
			/>

			<div className="flex items-center gap-2 mb-4">
				<span className="text-sm text-ink-2">Entity:</span>
				<Select
					value={entity}
					onChange={e => setSearch({ entity: e.target.value })}
					className="w-56"
				>
					{ENTITIES.map(e => (
						<option key={e.value} value={e.value}>
							{e.label}
						</option>
					))}
				</Select>
			</div>

			<Card pad="sm">
				{fields.isLoading && <CenterSpinner />}
				{!fields.isLoading && fields.data?.data.length === 0 && (
					<EmptyState
						icon={<SlidersHorizontal size={24} />}
						title="No custom fields"
						hint={`Add a field to extend ${humanise(entity)}.`}
					/>
				)}
				<div className="divide-y divide-line">
					{(fields.data?.data ?? [])
						.slice()
						.sort((a, b) => a.displayOrder - b.displayOrder)
						.map(f => (
							<div key={f.id} className="flex items-center gap-3 py-2.5">
								<GripVertical size={14} className="text-ink-3 shrink-0" />
								<button
									onClick={() => canAdmin && setEditing(f)}
									className="flex-1 min-w-0 text-left"
								>
									<div className="flex items-center gap-2">
										<span className="text-sm font-medium text-ink">
											{f.label}
										</span>
										<span className="font-mono text-[11px] text-ink-3">
											{f.fieldKey}
										</span>
										{f.isRequired && (
											<Badge size="xs" variant="danger">
												Required
											</Badge>
										)}
										{!f.isActive && (
											<Badge size="xs" variant="neutral">
												Inactive
											</Badge>
										)}
									</div>
									{f.helpText && (
										<div className="text-xs text-ink-3 mt-0.5">
											{f.helpText}
										</div>
									)}
								</button>
								<Badge variant="neutral" size="sm" className="capitalize">
									{f.fieldType}
								</Badge>
								{canAdmin && (
									<Button
										variant="ghost"
										size="xs"
										leadingIcon={<Trash2 size={12} />}
										onClick={async () => {
											const ok = await confirm({
												title: `Delete "${f.label}"?`,
												description:
													"Existing data stored under this field will become inaccessible.",
												tone: "danger",
												confirmLabel: "Delete",
											});
											if (ok) del.mutate(f.id);
										}}
									>
										Delete
									</Button>
								)}
							</div>
						))}
				</div>
			</Card>

			{(editing || creating) && (
				<FieldDefDrawer
					field={editing}
					entity={entity}
					onClose={() => {
						setEditing(null);
						setCreating(false);
					}}
				/>
			)}
		</div>
	);
}

function FieldDefDrawer({
	field,
	entity,
	onClose,
}: {
	field: FieldDef | null;
	entity: string;
	onClose: () => void;
}) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const isEdit = !!field;
	const [form, setForm] = useState<Partial<FieldDef>>(
		field ?? { entity, fieldType: "text", isRequired: false, isActive: true },
	);
	const [optionsText, setOptionsText] = useState((field?.options ?? []).join("\n"));

	const save = useMutation({
		mutationFn: () => {
			const path = `/api/v1/c/${conference.slug}/custom-fields`;
			const body: any = {
				entity,
				fieldKey: form.fieldKey,
				label: form.label,
				fieldType: form.fieldType,
				isRequired: form.isRequired ?? false,
				isActive: form.isActive ?? true,
				helpText: form.helpText || undefined,
			};
			if (HAS_OPTIONS.has(form.fieldType ?? "")) {
				body.options = optionsText
					.split("\n")
					.map(s => s.trim())
					.filter(Boolean);
			}
			return isEdit ? api.patch(`${path}/${field!.id}`, body) : api.post(path, body);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["custom-fields", conference.slug, entity] });
			toast.success(isEdit ? "Field updated" : "Field created");
			onClose();
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});
	const upd = (p: Partial<FieldDef>) => setForm(f => ({ ...f, ...p }));

	const onLabelChange = (label: string) => {
		const patch: Partial<FieldDef> = { label };
		if (!isEdit) {
			patch.fieldKey = label
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "_")
				.replace(/^_+|_+$/g, "");
		}
		upd(patch);
	};

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={isEdit ? field!.label : "New custom field"}
			subtitle={`On ${humanise(entity)}`}
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
				<FieldRow label="Label" required>
					<Input
						value={form.label ?? ""}
						onChange={e => onLabelChange(e.target.value)}
						placeholder="e.g. T-shirt size"
					/>
				</FieldRow>
				<FieldRow
					label="Field key"
					required
					hint="Stable identifier used in the JSONB store. Avoid changing after data exists."
				>
					<Input
						value={form.fieldKey ?? ""}
						onChange={e => upd({ fieldKey: e.target.value })}
						disabled={isEdit}
						className="font-mono text-[13px]"
					/>
				</FieldRow>
				<FieldRow label="Type">
					<Select
						value={form.fieldType ?? "text"}
						onChange={e => upd({ fieldType: e.target.value })}
					>
						{FIELD_TYPES.map(t => (
							<option key={t} value={t}>
								{humanise(t)}
							</option>
						))}
					</Select>
				</FieldRow>
				{HAS_OPTIONS.has(form.fieldType ?? "") && (
					<FieldRow label="Options" hint="One option per line.">
						<Textarea
							value={optionsText}
							onChange={e => setOptionsText(e.target.value)}
							className="min-h-[110px]"
							placeholder={"Small\nMedium\nLarge"}
						/>
					</FieldRow>
				)}
				<FieldRow label="Help text">
					<Input
						value={form.helpText ?? ""}
						onChange={e => upd({ helpText: e.target.value })}
					/>
				</FieldRow>
				<div className="flex items-center gap-5">
					<label className="flex items-center gap-2 text-sm text-ink-2">
						<input
							type="checkbox"
							checked={form.isRequired ?? false}
							onChange={e => upd({ isRequired: e.target.checked })}
							className="size-4 accent-accent"
						/>
						Required
					</label>
					<label className="flex items-center gap-2 text-sm text-ink-2">
						<input
							type="checkbox"
							checked={form.isActive ?? true}
							onChange={e => upd({ isActive: e.target.checked })}
							className="size-4 accent-accent"
						/>
						Active
					</label>
				</div>
			</div>
		</EntityDrawer>
	);
}
