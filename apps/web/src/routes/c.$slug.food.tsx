import { useState } from "react";

import { api, ApiError } from "@/lib/api";
import { hasRole, useConference } from "@/lib/ConferenceContext";
import { fmtDate } from "@/lib/format";
import { useRealtime } from "@/lib/useRealtime";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Plus, QrCode, Utensils } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { DatePickerInput } from "@/components/DatePicker";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

const Search = z.object({ scanOpen: z.string().optional() });

export const Route = createFileRoute("/c/$slug/food")({
	validateSearch: s => Search.parse(s),
	component: FoodPage,
});

type FoodPlan = {
	id: string;
	mealDate: string;
	breakfastCount?: number;
	lunchCount?: number;
	dinnerCount?: number;
	snacksCount?: number;
	expectedHeadcount?: number | null;
	vegCount?: number;
	nonVegCount?: number;
	notes?: string | null;
};
type ScanStat = {
	mealDate: string;
	mealType: string;
	count: number;
};

const MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const;

function FoodPage() {
	const { conference, membership } = useConference();
	const canEdit = hasRole(membership, "editor");
	const qc = useQueryClient();

	const plans = useQuery<{ data: FoodPlan[] }>({
		queryKey: ["food-plans", conference.slug],
		queryFn: () =>
			api.get<{ data: FoodPlan[] }>(`/api/v1/c/${conference.slug}/food/plans`, {
				pageSize: 60,
			}),
	});
	const scanStats = useQuery<{ data: ScanStat[] }>({
		queryKey: ["meal-scan-stats", conference.slug],
		queryFn: () =>
			api.get<{ data: ScanStat[] }>(`/api/v1/c/${conference.slug}/food/scans/stats`),
		refetchInterval: 30000,
	});

	useRealtime(conference.slug, ev => {
		if (ev.type === "meal_scan.created") {
			qc.invalidateQueries({ queryKey: ["meal-scan-stats", conference.slug] });
		}
	});

	const [planOpen, setPlanOpen] = useState(false);
	const [scanOpen, setScanOpen] = useState(false);

	const statFor = (date: string, meal: string) =>
		scanStats.data?.data.find(s => s.mealDate === date && s.mealType === meal)?.count ?? 0;

	return (
		<div className="p-6">
			<PageHeader
				title="Food & Dining"
				description="Meal plans and live scan headcounts per dining session."
				actions={
					canEdit && (
						<>
							<Button
								variant="secondary"
								leadingIcon={<QrCode size={14} />}
								onClick={() => setScanOpen(true)}
							>
								Record scan
							</Button>
							<Button
								variant="primary"
								leadingIcon={<Plus size={14} />}
								onClick={() => setPlanOpen(true)}
							>
								Add meal plan
							</Button>
						</>
					)
				}
			/>

			{plans.isLoading && <CenterSpinner />}
			{plans.data?.data.length === 0 && (
				<Card>
					<EmptyState
						icon={<Utensils size={24} />}
						title="No meal plans yet"
						hint="Add a meal plan for each conference day."
					/>
				</Card>
			)}

			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
				{(plans.data?.data ?? []).map(p => (
					<Card key={p.id} title={fmtDate(p.mealDate, "EEEE, d MMM")}>
						<div className="space-y-2.5">
							{MEALS.map(meal => {
								const scanned = statFor(p.mealDate, meal);
								const expected = p.expectedHeadcount ?? 0;
								const pct = expected ? Math.round((scanned / expected) * 100) : 0;
								return (
									<div key={meal} className="flex items-center gap-3">
										<div className="w-20 text-xs capitalize text-ink-2">
											{meal}
										</div>
										<div className="flex-1 h-1.5 rounded-full bg-line/70 overflow-hidden">
											<div
												className="h-full bg-accent rounded-full"
												style={{ width: `${Math.min(100, pct)}%` }}
											/>
										</div>
										<div className="text-xs tabular-nums text-ink-2 w-16 text-right">
											{scanned}
											{expected ? ` / ${expected}` : ""}
										</div>
									</div>
								);
							})}
							{(p.vegCount != null || p.nonVegCount != null) && (
								<div className="pt-2 mt-1 border-t border-line flex gap-2">
									<Badge variant="success">Veg {p.vegCount ?? 0}</Badge>
									<Badge variant="warn">Non-veg {p.nonVegCount ?? 0}</Badge>
								</div>
							)}
						</div>
					</Card>
				))}
			</div>

			{planOpen && <PlanDrawer onClose={() => setPlanOpen(false)} />}
			{scanOpen && <ScanDrawer onClose={() => setScanOpen(false)} />}
		</div>
	);
}

function PlanDrawer({ onClose }: { onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const [form, setForm] = useState({
		mealDate: "",
		expectedHeadcount: "",
		notes: "",
	});
	const create = useMutation({
		mutationFn: () =>
			api.post(`/api/v1/c/${conference.slug}/food/plans`, {
				mealDate: form.mealDate,
				expectedHeadcount: form.expectedHeadcount
					? Number(form.expectedHeadcount)
					: undefined,
				notes: form.notes || undefined,
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["food-plans", conference.slug] });
			toast.success("Meal plan added");
			onClose();
		},
		onError: (e: any) => toast.error("Create failed", e.message),
	});
	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title="Add meal plan"
			width="sm"
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
				<FieldRow label="Date" required>
					<DatePickerInput
						value={form.mealDate}
						onChange={e => setForm(p => ({ ...p, mealDate: e }))}
					/>
				</FieldRow>
				<FieldRow label="Expected headcount">
					<Input
						type="number"
						value={form.expectedHeadcount}
						onChange={e => setForm(p => ({ ...p, expectedHeadcount: e.target.value }))}
					/>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}

function ScanDrawer({ onClose }: { onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const [form, setForm] = useState({
		attendeeCode: "",
		mealDate: new Date().toISOString().slice(0, 10),
		mealType: "lunch",
	});
	const scan = useMutation({
		mutationFn: () =>
			api.post(`/api/v1/c/${conference.slug}/food/scans`, {
				attendeeCode: form.attendeeCode.trim(),
				mealDate: form.mealDate,
				mealType: form.mealType,
			}),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: ["meal-scan-stats", conference.slug] });
			toast.success("Scan recorded", `${form.attendeeCode} · ${form.mealType}`);
			setForm(p => ({ ...p, attendeeCode: "" }));
		},
		onError: (err: any) => {
			if (err instanceof ApiError && err.status === 409) {
				toast.warn("Already scanned", "This attendee was already scanned for this meal.");
			} else {
				toast.error("Scan failed", err.message);
			}
		},
	});
	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title="Record meal scan"
			subtitle="Scan or type the attendee code"
			width="sm"
			footer={
				<>
					<Button variant="ghost" onClick={onClose}>
						Close
					</Button>
					<Button
						variant="primary"
						loading={scan.isPending}
						onClick={() => scan.mutate()}
						leadingIcon={<QrCode size={13} />}
					>
						Record
					</Button>
				</>
			}
		>
			<div className="space-y-4">
				<FieldRow label="Attendee code" required>
					<Input
						autoFocus
						value={form.attendeeCode}
						onChange={e => setForm(p => ({ ...p, attendeeCode: e.target.value }))}
						onKeyDown={e => e.key === "Enter" && scan.mutate()}
						placeholder="DNC26-00042"
					/>
				</FieldRow>
				<FieldRow label="Date" required>
					<DatePickerInput
						value={form.mealDate}
						onChange={e => setForm(p => ({ ...p, mealDate: e }))}
					/>
				</FieldRow>
				<FieldRow label="Meal" required>
					<Select
						value={form.mealType}
						onChange={e => setForm(p => ({ ...p, mealType: e.target.value }))}
					>
						{MEALS.map(m => (
							<option key={m} value={m}>
								{m}
							</option>
						))}
					</Select>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}
