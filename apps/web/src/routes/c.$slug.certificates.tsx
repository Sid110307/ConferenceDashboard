import { useMemo, useState } from "react";

import { api } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { fmtDateTime, humanise } from "@/lib/format";
import { useListQuery } from "@/lib/useListQuery";
import { useUrlState } from "@/lib/useUrlState";
import { type Attendee } from "@conference/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { z } from "zod";

import { Badge, StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DataTable, Pagination, type Column } from "@/components/DataTable";
import { DatePickerInput } from "@/components/DatePicker";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

const Search = z.object({
	page: z.coerce.number().int().min(1).default(1).optional(),
});

export const Route = createFileRoute("/c/$slug/certificates")({
	validateSearch: s => Search.parse(s),
	component: CertificatesPage,
});

type Certificate = {
	id: string;
	attendeeId: string;
	certificateType: string;
	certificateCode: string;
	status: string;
	generatedAt?: string | null;
	issuedAt?: string | null;
	emailedAt?: string | null;
	printedAt?: string | null;
	revokedAt?: string | null;
	certificateFileId?: string | null;
	verificationToken?: string | null;
	createdAt: string;
};

const PAGE_SIZE = 20;
const TYPES = ["participation", "speaker", "volunteer", "organizer", "award"] as const;
const STATUSES = ["not_issued", "generated", "emailed", "printed", "revoked"] as const;

function CertificatesPage() {
	const { membership, conference } = useConference();
	const canEdit = hasAtLeastRole(membership, "editor");
	const [search, setSearch] = useUrlState<z.infer<typeof Search>>();
	const list = useListQuery<Certificate>({
		key: ["certificates", conference.slug],
		path: `/api/v1/c/${conference.slug}/certificates`,
		params: { page: search.page, pageSize: PAGE_SIZE },
	});
	const attendees = useListQuery<Attendee>({
		key: ["certificate-attendees", conference.slug],
		path: `/api/v1/c/${conference.slug}/attendees`,
		params: { pageSize: 200 },
	});
	const rows = list.data?.data ?? [];
	const total = list.data?.pagination?.total ?? 0;
	const [editing, setEditing] = useState<Certificate | null>(null);
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

	const cols: Column<Certificate>[] = [
		{
			key: "code",
			header: "Certificate code",
			cell: r => (
				<span className="font-mono text-[11px] text-ink-2">{r.certificateCode}</span>
			),
			width: "w-48",
		},
		{
			key: "attendee",
			header: "Attendee",
			cell: r => attendeeMap.get(r.attendeeId) ?? r.attendeeId.slice(0, 8),
		},
		{
			key: "type",
			header: "Type",
			cell: r => (
				<Badge variant="accent" className="capitalize">
					{humanise(r.certificateType)}
				</Badge>
			),
			width: "w-36",
		},
		{
			key: "status",
			header: "Status",
			cell: r => <StatusBadge status={r.status} />,
			width: "w-32",
		},
		{
			key: "dates",
			header: "Timeline",
			cell: r => (
				<div className="text-xs text-ink-2">
					{r.generatedAt ? `Gen ${fmtDateTime(r.generatedAt)}` : "Not generated"}
					<div className="text-ink-3">
						{r.issuedAt ? `Issued ${fmtDateTime(r.issuedAt)}` : ""}
					</div>
				</div>
			),
			width: "w-64",
		},
	];

	return (
		<div className="p-6">
			<PageHeader
				title="Certificates"
				description="Issue, track, and revoke conference certificates."
				actions={
					canEdit ? (
						<Button
							variant="primary"
							leadingIcon={<Plus size={14} />}
							onClick={() => setCreating(true)}
						>
							New certificate
						</Button>
					) : undefined
				}
			/>
			<Card pad="sm">
				<DataTable
					columns={cols}
					rows={rows}
					loading={list.isLoading || attendees.isLoading}
					onRowClick={r => setEditing(r)}
					selectedKey={editing?.id ?? null}
					emptyTitle="No certificates yet"
					emptyHint="Create certificates after the conference."
				/>
				<Pagination
					page={search.page ?? 1}
					pageSize={PAGE_SIZE}
					total={total}
					onChange={p => setSearch({ page: p })}
				/>
			</Card>
			{(editing || creating) && (
				<CertificateDrawer
					certificate={editing}
					attendees={attendees.data?.data ?? []}
					onClose={() => {
						setEditing(null);
						setCreating(false);
					}}
				/>
			)}
		</div>
	);
}

function CertificateDrawer({
	certificate,
	attendees,
	onClose,
}: {
	certificate: Certificate | null;
	attendees: Attendee[];
	onClose: () => void;
}) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const isEdit = !!certificate;
	const [form, setForm] = useState<Partial<Certificate>>(
		certificate ?? { certificateType: "participation", status: "not_issued" },
	);
	const save = useMutation({
		mutationFn: () => {
			const path = `/api/v1/c/${conference.slug}/certificates`;
			const body = {
				attendeeId: form.attendeeId,
				certificateType: form.certificateType,
				certificateCode: form.certificateCode,
				status: form.status,
				generatedAt: form.generatedAt || undefined,
				issuedAt: form.issuedAt || undefined,
				emailedAt: form.emailedAt || undefined,
				printedAt: form.printedAt || undefined,
				revokedAt: form.revokedAt || undefined,
				certificateFileId: form.certificateFileId || undefined,
				verificationToken: form.verificationToken || undefined,
			};
			return isEdit ? api.patch(`${path}/${certificate!.id}`, body) : api.post(path, body);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["certificates", conference.slug] })
				.catch(console.error)
				.catch(console.error);
			toast.success(isEdit ? "Certificate updated" : "Certificate created");
			onClose();
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});
	const upd = (p: Partial<Certificate>) => setForm(f => ({ ...f, ...p }));
	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={isEdit ? "Edit certificate" : "New certificate"}
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
				<FieldRow label="Attendee">
					<Select
						value={form.attendeeId ?? ""}
						onChange={e => upd({ attendeeId: e.target.value })}
					>
						<option value="">—</option>
						{attendees.map(a => (
							<option key={a.id} value={a.id}>
								{a.name} ({a.attendeeCode})
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Type">
					<Select
						value={form.certificateType ?? "participation"}
						onChange={e => upd({ certificateType: e.target.value })}
					>
						{TYPES.map(t => (
							<option key={t} value={t}>
								{humanise(t)}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Code">
					<Input
						value={form.certificateCode ?? ""}
						onChange={e => upd({ certificateCode: e.target.value })}
					/>
				</FieldRow>
				<FieldRow label="Status">
					<Select
						value={form.status ?? "not_issued"}
						onChange={e => upd({ status: e.target.value })}
					>
						{STATUSES.map(s => (
							<option key={s} value={s}>
								{humanise(s)}
							</option>
						))}
					</Select>
				</FieldRow>
				{(["generatedAt", "issuedAt", "emailedAt", "printedAt", "revokedAt"] as const).map(
					k => (
						<FieldRow key={k} label={humanise(k)}>
							<DatePickerInput
								mode="datetime"
								value={(form as any)[k] ?? undefined}
								onChange={value => upd({ [k]: value } as any)}
							/>
						</FieldRow>
					),
				)}
				<FieldRow label="Certificate file ID">
					<Input
						value={form.certificateFileId ?? ""}
						onChange={e => upd({ certificateFileId: e.target.value || undefined })}
					/>
				</FieldRow>
				<FieldRow label="Verification token">
					<Input
						value={form.verificationToken ?? ""}
						onChange={e => upd({ verificationToken: e.target.value || undefined })}
					/>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}
