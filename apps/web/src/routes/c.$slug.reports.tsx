import { useState } from "react";

import { api } from "@/lib/api";
import { useConference } from "@/lib/ConferenceContext";
import { fmtNumber, fmtRelative, humanise } from "@/lib/format";
import { useRealtime } from "@/lib/useRealtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Download, FileBarChart2, Plus } from "lucide-react";

import { StatusBadge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Select } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

export const Route = createFileRoute("/c/$slug/reports")({
	component: ReportsPage,
});

type ReportJob = {
	id: string;
	reportType: string;
	format: string;
	status: string;
	rowCount?: number | null;
	outputFileId?: string | null;
	errorMessage?: string | null;
	createdAt: string;
};

const REPORT_TYPES = [
	{ value: "attendees_full", label: "Attendeees" },
	{ value: "travel_manifest", label: "Travel manifest" },
	{ value: "accommodation_roster", label: "Accommodation roster" },
	{ value: "food_meal_counts", label: "Food" },
	{ value: "helpdesk_log", label: "Helpdesk log" },
	{ value: "finance_summary", label: "Finance summary" },
];

function ReportsPage() {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();

	const jobs = useQuery<{ data: ReportJob[] }>({
		queryKey: ["reports", conference.slug],
		queryFn: () => api.get<{ data: ReportJob[] }>(`/api/v1/c/${conference.slug}/reports`),
		refetchInterval: 4000,
	});

	useRealtime(conference.slug, ev => {
		if (ev.type.startsWith("report.")) {
			qc.invalidateQueries({ queryKey: ["reports", conference.slug] });
		}
	});

	const [genOpen, setGenOpen] = useState(false);

	const download = async (job: ReportJob) => {
		try {
			const r = await api.get<{ url: string }>(
				`/api/v1/c/${conference.slug}/reports/${job.id}/download`,
			);
			window.open(r.url, "_blank");
		} catch (e: any) {
			toast.error("Download failed", e.message);
		}
	};

	return (
		<div className="p-6">
			<PageHeader
				title="Reports"
				description="Generate CSV, XLSX, or PDF exports of conference data."
				actions={
					<Button
						variant="primary"
						leadingIcon={<Plus size={14} />}
						onClick={() => setGenOpen(true)}
					>
						Generate report
					</Button>
				}
			/>

			{jobs.isLoading && <CenterSpinner />}
			{jobs.data?.data.length === 0 && (
				<Card>
					<EmptyState
						icon={<FileBarChart2 size={24} />}
						title="No reports yet"
						hint="Generate one to export your data."
					/>
				</Card>
			)}

			<div className="space-y-2">
				{(jobs.data?.data ?? []).map(j => (
					<Card key={j.id} pad="sm">
						<div className="flex items-center justify-between gap-3">
							<div className="min-w-0">
								<div className="text-sm font-semibold text-ink">
									{REPORT_TYPES.find(t => t.value === j.reportType)?.label ??
										humanise(j.reportType)}
								</div>
								<div className="mt-0.5 text-xs text-ink-3">
									{j.format.toUpperCase()} ·{" "}
									{j.rowCount != null ? `${fmtNumber(j.rowCount)} rows · ` : ""}
									{fmtRelative(j.createdAt)}
								</div>
							</div>
							<div className="flex items-center gap-3 shrink-0">
								<StatusBadge status={j.status} />
								{j.status === "completed" && j.outputFileId && (
									<Button
										variant="secondary"
										size="sm"
										leadingIcon={<Download size={13} />}
										onClick={() => download(j)}
									>
										Download
									</Button>
								)}
							</div>
						</div>
						{j.status === "failed" && j.errorMessage && (
							<div className="mt-2 text-xs text-danger-soft-fg">{j.errorMessage}</div>
						)}
					</Card>
				))}
			</div>

			{genOpen && <GenerateDrawer onClose={() => setGenOpen(false)} />}
		</div>
	);
}

function GenerateDrawer({ onClose }: { onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const [reportType, setReportType] = useState("attendees_full");
	const [format, setFormat] = useState("xlsx");

	const gen = useMutation({
		mutationFn: () => api.post(`/api/v1/c/${conference.slug}/reports`, { reportType, format }),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["reports", conference.slug] });
			toast.success("Report queued", "It will appear in the list when ready.");
			onClose();
		},
		onError: (e: any) => toast.error("Could not queue report", e.message),
	});

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title="Generate report"
			width="sm"
			footer={
				<>
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button variant="primary" loading={gen.isPending} onClick={() => gen.mutate()}>
						Generate
					</Button>
				</>
			}
		>
			<div className="space-y-4">
				<FieldRow label="Report type">
					<Select value={reportType} onChange={e => setReportType(e.target.value)}>
						{REPORT_TYPES.map(t => (
							<option key={t.value} value={t.value}>
								{t.label}
							</option>
						))}
					</Select>
				</FieldRow>
				<FieldRow label="Format">
					<Select value={format} onChange={e => setFormat(e.target.value)}>
						<option value="xlsx">Excel (XLSX)</option>
						<option value="csv">CSV</option>
						<option value="pdf">PDF</option>
					</Select>
				</FieldRow>
				<p className="text-xs text-ink-3">
					Large exports are best as CSV or XLSX. PDF is intended for short printable
					summaries.
				</p>
			</div>
		</EntityDrawer>
	);
}
