import { useRef, useState } from "react";

import { api } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { fmtRelative, humanise } from "@/lib/format";
import { cx } from "@/lib/uiStyles";
import { useRealtime } from "@/lib/useRealtime";
import {
	IMPORT_ENTITIES,
	importJobActionSchema,
	importJobCreateSchema,
	importJobMappingSchema,
	type ImportEntity,
	type ImportJob,
	type ImportJobActionInput,
	type ImportJobCreateInput,
	type ImportJobMappingInput,
	type ImportRow,
} from "@conference/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, CheckCircle2, FileSpreadsheet, RotateCcw } from "lucide-react";

import { StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useConfirm } from "@/components/ConfirmDialog";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";
import { FieldRow } from "@/components/FieldRow";
import { Select } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { ProgressBar } from "@/components/ProgressBar";
import { useToast } from "@/components/Toast";

export const Route = createFileRoute("/c/$slug/imports")({
	component: ImportsPage,
});

const ENTITY_FIELDS: Record<string, { key: string; label: string; required?: boolean }[]> = {
	attendees: [
		{ key: "name", label: "Name", required: true },
		{ key: "email", label: "Email" },
		{ key: "phone", label: "Phone" },
		{ key: "gender", label: "Gender" },
		{ key: "category", label: "Category" },
		{ key: "institution", label: "Institution" },
		{ key: "designation", label: "Designation" },
		{ key: "prantha", label: "Prantha" },
		{ key: "dietaryPreference", label: "Dietary preference" },
		{ key: "bloodGroup", label: "Blood group" },
	],
	staff: [
		{ key: "name", label: "Name", required: true },
		{ key: "email", label: "Email" },
		{ key: "phone", label: "Phone" },
		{ key: "prantha", label: "Prantha" },
		{ key: "bloodGroup", label: "Blood group" },
		{ key: "role", label: "Role" },
	],
	travel_segments: [
		{ key: "attendeeRef", label: "Attendee (code or email)", required: true },
		{ key: "direction", label: "Direction", required: true },
		{ key: "travelMode", label: "Travel mode" },
		{ key: "carrier", label: "Carrier" },
		{ key: "serviceNumber", label: "Service number" },
		{ key: "originCity", label: "Origin city" },
		{ key: "destinationCity", label: "Destination city" },
		{ key: "scheduledTime", label: "Scheduled time (ISO)" },
	],
};

function ImportsPage() {
	const { conference, membership } = useConference();
	const canEdit = hasAtLeastRole(membership, "editor");
	const qc = useQueryClient();

	const jobs = useQuery<{ data: ImportJob[] }>({
		queryKey: ["import-jobs", conference.slug],
		queryFn: () => api.get<{ data: ImportJob[] }>(`/api/v1/c/${conference.slug}/imports`),
		refetchInterval: 5000,
	});

	useRealtime(conference.slug, ev => {
		if (ev.type.startsWith("import.")) {
			qc.invalidateQueries({ queryKey: ["import-jobs", conference.slug] }).catch(
				console.error,
			);
			if (ev.id)
				qc.invalidateQueries({ queryKey: ["import-job", conference.slug, ev.id] }).catch(
					console.error,
				);
		}
	});

	const [activeJobId, setActiveJobId] = useState<string | null>(null);

	if (!canEdit) {
		return (
			<div className="p-6">
				<PageHeader title="Imports" />
				<Card>
					<EmptyState
						title="Editor access required"
						hint="Bulk imports can only be run by editors and admins."
					/>
				</Card>
			</div>
		);
	}

	return (
		<div className="p-6">
			<PageHeader
				title="Bulk imports"
				description="Upload CSV or Excel files to bulk import attendees, staff, or travel segments."
			/>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
				<div className="lg:col-span-1 space-y-2">
					<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3 px-1">
						Recent imports
					</div>
					{jobs.isLoading && <CenterSpinner />}
					{jobs.data?.data.length === 0 && (
						<Card>
							<div className="text-sm text-ink-3 py-4 text-center">
								No imports yet.
							</div>
						</Card>
					)}
					{(jobs.data?.data ?? []).map(j => (
						<button
							key={j.id}
							onClick={() => setActiveJobId(j.id)}
							className={cx(
								"w-full text-left bg-surface rounded-lg p-3 border transition-colors",
								activeJobId === j.id
									? "border-accent"
									: "border-line hover:border-line-2",
							)}
						>
							<div className="flex items-center justify-between gap-2">
								<span className="text-sm font-medium text-ink capitalize">
									{humanise(j.targetEntity)}
								</span>
								<StatusBadge status={j.status} />
							</div>
							<div className="mt-1 text-xs text-ink-3 truncate">
								{j.sourceFilename ?? "—"} · {fmtRelative(j.createdAt)}
							</div>
						</button>
					))}
				</div>
				<div className="lg:col-span-2">
					{activeJobId ? (
						<JobWizard jobId={activeJobId} onReset={() => setActiveJobId(null)} />
					) : (
						<NewImportCard onCreated={id => setActiveJobId(id)} />
					)}
				</div>
			</div>
		</div>
	);
}

function NewImportCard({ onCreated }: { onCreated: (jobId: string) => void }) {
	const { conference } = useConference();
	const toast = useToast();
	const fileInput = useRef<HTMLInputElement>(null);
	const [entity, setEntity] = useState<ImportEntity>("attendees");
	const [busy, setBusy] = useState(false);

	const handleFile = async (file: File) => {
		setBusy(true);
		try {
			const ext = file.name.toLowerCase().split(".").pop() ?? "";
			const contentType =
				file.type && file.type !== "application/octet-stream"
					? file.type
					: ext === "xlsx"
						? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
						: ext === "xls"
							? "application/vnd.ms-excel"
							: "text/csv";

			const presign = await api.post<{
				fileId: string;
				uploadUrl: string;
				key: string;
			}>(`/api/v1/c/${conference.slug}/files/presign`, {
				filename: file.name,
				contentType,
				size: file.size,
				purpose: "import_source",
			});

			const put = await fetch(presign.uploadUrl, {
				method: "PUT",
				body: file,
				headers: { "Content-Type": contentType },
			});
			if (!put.ok) throw new Error("file upload failed");

			await api.post(`/api/v1/c/${conference.slug}/files/${presign.fileId}/commit`, {});

			const job = await api.post<{ data: ImportJob }>(
				`/api/v1/c/${conference.slug}/imports`,
				importJobCreateSchema.parse({
					targetEntity: entity,
					fileId: presign.fileId,
				}) as ImportJobCreateInput,
			);

			await api.post(`/api/v1/c/${conference.slug}/imports/${job.data.id}/action`, {
				...importJobActionSchema.parse({ action: "preview" }),
			});
			toast.success("Upload received", "Parsing and validating rows...");
			onCreated(job.data.id);
		} catch (err: any) {
			toast.error("Import failed to start", err.message);
		} finally {
			setBusy(false);
		}
	};

	return (
		<Card title="New import" subtitle="Step 1: choose entity and upload a file">
			<div className="space-y-4">
				<FieldRow label="Import into">
					<Select
						value={entity}
						onChange={e => setEntity(e.target.value as ImportEntity)}
					>
						{IMPORT_ENTITIES.map(v => (
							<option key={v} value={v}>
								{humanise(v)}
							</option>
						))}
					</Select>
				</FieldRow>

				<div
					onClick={() => fileInput.current?.click()}
					onDragOver={e => e.preventDefault()}
					onDrop={e => {
						e.preventDefault();
						const f = e.dataTransfer.files?.[0];
						if (f) handleFile(f);
					}}
					className="border-2 border-dashed border-line-2 rounded-lg p-8 text-center cursor-pointer hover:border-accent hover:bg-surface-2 transition-colors"
				>
					<input
						ref={fileInput}
						type="file"
						accept=".csv,.xlsx,.xls"
						className="hidden"
						onChange={e => {
							const f = e.target.files?.[0];
							if (f) handleFile(f);
						}}
					/>
					{busy ? (
						<CenterSpinner label="Uploading..." />
					) : (
						<>
							<FileSpreadsheet size={28} className="mx-auto text-ink-3" />
							<div className="mt-2 text-sm font-medium text-ink">
								Click to choose, or drag a file here
							</div>
							<div className="mt-1 text-xs text-ink-3">
								CSV or XLSX, up to 50,000 rows
							</div>
						</>
					)}
				</div>
			</div>
		</Card>
	);
}

function JobWizard({ jobId, onReset }: { jobId: string; onReset: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const confirm = useConfirm();

	const job = useQuery<{ data: ImportJob }>({
		queryKey: ["import-job", conference.slug, jobId],
		queryFn: () =>
			api.get<{ data: ImportJob }>(`/api/v1/c/${conference.slug}/imports/${jobId}`),
		refetchInterval: q => {
			const s = q.state.data?.data.status;
			return s === "importing" || s === "previewing" || s === "rolling_back" ? 1500 : false;
		},
	});

	const j = job.data?.data;

	const action = useMutation({
		mutationFn: (body: ImportJobActionInput) =>
			api.post(
				`/api/v1/c/${conference.slug}/imports/${jobId}/action`,
				importJobActionSchema.parse(body),
			),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["import-job", conference.slug, jobId] }).catch(
				console.error,
			);
			qc.invalidateQueries({ queryKey: ["import-jobs", conference.slug] }).catch(
				console.error,
			);
		},
		onError: (e: any) => toast.error("Action failed", e.message),
	});
	const mapping = useMutation({
		mutationFn: async (body: ImportJobMappingInput) => {
			await api.post(
				`/api/v1/c/${conference.slug}/imports/${jobId}/mapping`,
				importJobMappingSchema.parse(body),
			);

			await api.post(`/api/v1/c/${conference.slug}/imports/${jobId}/action`, {
				...importJobActionSchema.parse({ action: "preview" }),
			});
		},
		onSuccess: () => qc.invalidateQueries({ queryKey: ["import-job", conference.slug, jobId] }),
		onError: (e: any) => toast.error("Could not save mapping", e.message),
	});

	if (job.isLoading || !j) return <CenterSpinner />;

	return (
		<div className="space-y-4">
			<Card
				title={`Import · ${humanise(j.targetEntity)}`}
				subtitle={j.sourceFilename}
				actions={<StatusBadge status={j.status} />}
			>
				<StepIndicator status={j.status} />
			</Card>
			{(j.status === "mapping" ||
				j.status === "uploaded" ||
				j.status === "previewing" ||
				j.status === "previewed" ||
				j.status === "with_errors") && (
				<MappingCard
					job={j}
					onSave={body => mapping.mutate(body)}
					saving={mapping.isPending}
				/>
			)}
			{(j.status === "previewed" || j.status === "with_errors") && (
				<PreviewCard job={j} jobId={jobId} />
			)}
			{j.status === "importing" && (
				<Card title="Importing...">
					<ProgressBar
						value={j.processedRowCount}
						max={j.totalRowCount || 1}
						label={`${j.processedRowCount} / ${j.totalRowCount} rows`}
						hint={`${Math.round((j.processedRowCount / (j.totalRowCount || 1)) * 100)}%`}
					/>
					<div className="mt-3 grid grid-cols-3 gap-2 text-center">
						<MiniCount label="Imported" value={j.importedRowCount} tone="success" />
						<MiniCount label="Duplicates" value={j.duplicateRowCount} tone="warn" />
						<MiniCount label="Failed" value={j.failedRowCount} tone="danger" />
					</div>
				</Card>
			)}
			{(j.status === "completed" || j.status === "with_errors") && (
				<Card>
					<div className="flex items-start gap-3">
						{j.status === "completed" ? (
							<CheckCircle2 className="text-success shrink-0" size={20} />
						) : (
							<AlertTriangle className="text-warn shrink-0" size={20} />
						)}
						<div className="flex-1">
							<div className="text-sm font-semibold text-ink">
								{j.status === "completed"
									? "Import completed"
									: "Import completed with errors"}
							</div>
							<div className="mt-1 text-xs text-ink-2">
								{j.importedRowCount} imported · {j.duplicateRowCount} duplicates
								skipped · {j.failedRowCount} failed
							</div>
							<div className="mt-3 flex gap-2">
								<Button
									variant="danger"
									size="sm"
									leadingIcon={<RotateCcw size={13} />}
									onClick={async () => {
										const ok = await confirm({
											title: "Roll back this import?",
											description: `This will delete the ${j.importedRowCount} records created by this import. This cannot be undone.`,
											tone: "danger",
											confirmLabel: "Roll back",
										});
										if (ok) action.mutate({ action: "rollback" });
									}}
								>
									Roll back
								</Button>
								<Button variant="ghost" size="sm" onClick={onReset}>
									New import
								</Button>
							</div>
						</div>
					</div>
				</Card>
			)}

			{j.status === "rolled_back" && (
				<Card>
					<EmptyState
						title="Import rolled back"
						hint="All records created by this import have been removed."
						action={
							<Button variant="primary" size="sm" onClick={onReset}>
								New import
							</Button>
						}
					/>
				</Card>
			)}

			{j.status === "failed" && (
				<Card>
					<div className="text-sm text-danger-soft-fg">
						Import failed: {j.errorMessage ?? "unknown error"}
					</div>
				</Card>
			)}
		</div>
	);
}

function StepIndicator({ status }: { status: string }) {
	const steps = ["upload", "map", "preview", "import", "done"];
	const stepOf: Record<string, number> = {
		uploaded: 1,
		mapping: 1,
		previewing: 2,
		previewed: 2,
		with_errors: 2,
		importing: 3,
		completed: 4,
		rolled_back: 4,
		rolling_back: 4,
		failed: 4,
	};
	const current = stepOf[status] ?? 0;
	return (
		<div className="flex items-center gap-1">
			{steps.map((s, i) => (
				<div key={s} className="flex items-center gap-1 flex-1">
					<div
						className={cx(
							"flex-1 h-1.5 rounded-full",
							i <= current ? "bg-accent" : "bg-line",
						)}
					/>
				</div>
			))}
		</div>
	);
}

function MappingCard({
	job,
	onSave,
	saving,
}: {
	job: ImportJob;
	onSave: (body: any) => void;
	saving: boolean;
}) {
	const fields = ENTITY_FIELDS[job.targetEntity] ?? [];
	const sourceCols = job.sourceColumns ?? [];
	const [map, setMap] = useState<Record<string, string>>(
		job.columnMapping ?? autoMatch(sourceCols, fields),
	);
	const [dedupeBy, setDedupeBy] = useState(job.options?.dedupe_by ?? "email");
	const [onDuplicate, setOnDuplicate] = useState(job.options?.on_duplicate ?? "skip");

	const locked = job.status === "previewing";

	return (
		<Card title="Map columns" subtitle="Step 2: match file columns to fields">
			{sourceCols.length === 0 ? (
				<div className="text-sm text-ink-3">Detecting columns...</div>
			) : (
				<div className="space-y-3">
					<div className="space-y-2">
						{fields.map(f => (
							<div key={f.key} className="flex items-center gap-3">
								<div className="w-44 text-sm text-ink">
									{f.label}
									{f.required && <span className="text-danger ml-0.5">*</span>}
								</div>
								<ArrowRight size={13} className="text-ink-3" />
								<Select
									className="flex-1"
									value={map[f.key] ?? ""}
									disabled={locked}
									onChange={e => setMap(m => ({ ...m, [f.key]: e.target.value }))}
								>
									<option value="">— skip —</option>
									{sourceCols.map((c: string) => (
										<option key={c} value={c}>
											{humanise(c)}
										</option>
									))}
								</Select>
							</div>
						))}
					</div>

					<div className="grid grid-cols-2 gap-3 pt-3 border-t border-line">
						<FieldRow label="Dedupe by">
							<Select
								value={dedupeBy}
								disabled={locked}
								onChange={e => setDedupeBy(e.target.value)}
							>
								<option value="email">Email</option>
								<option value="phone">Phone</option>
								<option value="">No deduplication</option>
							</Select>
						</FieldRow>
						<FieldRow label="On duplicate">
							<Select
								value={onDuplicate}
								disabled={locked}
								onChange={e =>
									setOnDuplicate(e.target.value as "skip" | "update" | "fail")
								}
							>
								<option value="skip">Skip</option>
								<option value="update">Update existing</option>
								<option value="fail">Fail the row</option>
							</Select>
						</FieldRow>
					</div>

					<div className="flex justify-end">
						<Button
							variant="primary"
							loading={saving}
							disabled={locked}
							onClick={() =>
								onSave({
									mapping: Object.fromEntries(
										Object.entries(map).filter(([, v]) => v),
									),
									options: {
										dedupe_by: dedupeBy || undefined,
										on_duplicate: onDuplicate,
										update_existing: onDuplicate === "update",
									},
								})
							}
						>
							Save mapping & re-preview
						</Button>
					</div>
				</div>
			)}
		</Card>
	);
}

function PreviewCard({ job, jobId }: { job: ImportJob; jobId: string }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const [showErrors, setShowErrors] = useState(false);

	const errorRows = useQuery<{ data: ImportRow[] }>({
		queryKey: ["import-rows", conference.slug, jobId],
		queryFn: () =>
			api.get<{ data: ImportRow[] }>(`/api/v1/c/${conference.slug}/imports/${jobId}/rows`, {
				status: "invalid",
				pageSize: 50,
			}),
		enabled: showErrors,
	});

	const start = useMutation({
		mutationFn: () =>
			api.post(`/api/v1/c/${conference.slug}/imports/${jobId}/action`, {
				...importJobActionSchema.parse({ action: "start" }),
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["import-job", conference.slug, jobId] }).catch(
				console.error,
			);
			toast.success("Import started");
		},
		onError: (e: any) => toast.error("Could not start", e.message),
	});

	return (
		<Card title="Preview" subtitle="Step 3: review validation results">
			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
				<MiniCount label="Total" value={job.totalRowCount} tone="neutral" />
				<MiniCount label="Valid" value={job.validRowCount} tone="success" />
				<MiniCount label="Duplicates" value={job.duplicateRowCount} tone="warn" />
				<MiniCount label="Invalid" value={job.invalidRowCount} tone="danger" />
			</div>

			{job.invalidRowCount > 0 && (
				<div className="mt-3">
					<button
						onClick={() => setShowErrors(s => !s)}
						className="text-xs text-accent hover:underline"
					>
						{showErrors ? "Hide" : "Show"} {job.invalidRowCount} invalid row(s)
					</button>
					{showErrors && (
						<div className="mt-2 max-h-64 overflow-y-auto border border-line rounded-md divide-y divide-line">
							{errorRows.isLoading && <CenterSpinner />}
							{(errorRows.data?.data ?? []).map(r => (
								<div key={r.id} className="p-2.5 text-xs">
									<div className="font-medium text-ink">Row {r.rowNumber}</div>
									<div className="mt-1 space-y-0.5">
										{Object.entries(r.errors ?? {}).map(([field, msg]) => (
											<div key={field} className="text-danger-soft-fg">
												<span className="font-mono">{field}</span>:{" "}
												{msg as string}
											</div>
										))}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			)}

			<div className="mt-4 flex items-center justify-between">
				<span className="text-xs text-ink-3">
					{job.validRowCount} row(s) will be imported.
				</span>
				<Button
					variant="primary"
					loading={start.isPending}
					disabled={job.validRowCount === 0}
					onClick={() => start.mutate()}
				>
					Start import
				</Button>
			</div>
		</Card>
	);
}

function MiniCount({
	label,
	value,
	tone,
}: {
	label: string;
	value: number;
	tone: "neutral" | "success" | "warn" | "danger";
}) {
	const toneCls = {
		neutral: "text-ink",
		success: "text-success-soft-fg",
		warn: "text-warn-soft-fg",
		danger: "text-danger-soft-fg",
	}[tone];
	return (
		<div className="bg-surface-2 border border-line rounded-md px-3 py-2 text-center">
			<div className="text-[10px] font-semibold uppercase tracking-wider text-ink-3">
				{label}
			</div>
			<div className={cx("mt-0.5 text-lg font-semibold tabular-nums", toneCls)}>{value}</div>
		</div>
	);
}

function autoMatch(
	cols: string[],
	fields: { key: string; label: string }[],
): Record<string, string> {
	const norm = (s: string) => s.toLowerCase().replace(/[\s_-]/g, "");
	const out: Record<string, string> = {};
	for (const f of fields) {
		const target = norm(f.key);
		const targetLabel = norm(f.label);
		const hit = cols.find(c => {
			const n = norm(c);
			return n === target || n === targetLabel;
		});
		if (hit) out[f.key] = hit;
	}
	return out;
}
