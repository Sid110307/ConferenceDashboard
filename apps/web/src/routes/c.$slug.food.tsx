import { useEffect, useRef, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { fmtDate, humanise } from "@/lib/format";
import { queryKeys } from "@/lib/queryKeys";
import { useRealtime } from "@/lib/useRealtime";
import { type FoodPlan } from "@conference/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { BrowserMultiFormatReader, IScannerControls } from "@zxing/browser";
import { BarcodeFormat, DecodeHintType } from "@zxing/library";
import { Camera, Plus, QrCode, Trash2, Utensils, X } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { useConfirm } from "@/components/ConfirmDialog";
import { DatePickerInput } from "@/components/DatePicker";
import { CenterSpinner, EmptyState } from "@/components/EmptyState";
import { EntityDrawer } from "@/components/EntityDrawer";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/Toast";

const Search = z.object({ scanOpen: z.string().optional() });

export const Route = createFileRoute("/c/$slug/food")({
	validateSearch: s => Search.parse(s),
	component: FoodPage,
});

type ScanStat = {
	mealDate: string;
	mealType: string;
	count: number;
};

const MEALS = ["breakfast", "lunch", "tea", "dinner", "snacks"] as const;

function FoodPage() {
	const { conference, membership } = useConference();
	const canEdit = hasAtLeastRole(membership, "editor");
	const qc = useQueryClient();

	const plans = useQuery<{ data: FoodPlan[] }>({
		queryKey: queryKeys.foodPlans(conference.slug),
		queryFn: () =>
			api.get<{ data: FoodPlan[] }>(`/api/v1/c/${conference.slug}/food/plans`, {
				pageSize: 60,
			}),
	});
	const scanStats = useQuery<{ data: ScanStat[] }>({
		queryKey: queryKeys.mealScanStats(conference.slug),
		queryFn: () =>
			api.get<{ data: ScanStat[] }>(`/api/v1/c/${conference.slug}/food/scans/stats`),
		refetchInterval: 30000,
	});

	useRealtime(conference.slug, ev => {
		if (ev.type === "meal_scan.created") {
			qc.invalidateQueries({ queryKey: queryKeys.mealScanStats(conference.slug) }).catch(
				console.error,
			);
		}
	});

	const [planOpen, setPlanOpen] = useState(false);
	const [editingPlan, setEditingPlan] = useState<FoodPlan | null>(null);
	const [scanOpen, setScanOpen] = useState(false);

	const statFor = (date: string, meal: string) =>
		scanStats.data?.data.find(s => s.mealDate === date && s.mealType === meal)?.count ?? 0;

	return (
		<div className="p-6">
			<PageHeader
				title="Food & Dining"
				description="Meal plans and scan records per dining session."
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
								onClick={() => {
									setPlanOpen(true);
									setEditingPlan(null);
								}}
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
			<div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
				{(plans.data?.data ?? []).map(p => (
					<button
						key={p.id}
						onClick={() => {
							setEditingPlan(p);
							setPlanOpen(true);
						}}
						className="group hover:cursor-pointer"
					>
						<Card
							title={fmtDate(p.mealDate, "EEEE, d MMM")}
							className="hover:border-accent transition-colors"
						>
							<div className="space-y-2.5">
								{MEALS.map(meal => {
									const scanned = statFor(p.mealDate, meal);
									const expected = p[`${meal}Count` as keyof FoodPlan] as
										| number
										| null;
									const pct = expected
										? Math.round((scanned / expected) * 100)
										: 0;
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
							</div>
							{p.notes && (
								<p className="mt-2 text-start text-sm text-ink-2 whitespace-pre-wrap">
									{p.notes}
								</p>
							)}
						</Card>
					</button>
				))}
			</div>

			{(planOpen || editingPlan) && (
				<PlanDrawer
					plan={editingPlan}
					onClose={() => {
						setPlanOpen(false);
						setEditingPlan(null);
					}}
				/>
			)}
			{scanOpen && <ScanDrawer onClose={() => setScanOpen(false)} />}
		</div>
	);
}

function PlanDrawer({ plan, onClose }: { plan: FoodPlan | null; onClose: () => void }) {
	const { conference } = useConference();
	const qc = useQueryClient();
	const toast = useToast();
	const confirm = useConfirm();
	const isEdit = !!plan;

	const [form, setForm] = useState({
		mealDate: plan?.mealDate ?? "",
		breakfastCount: plan?.breakfastCount ? String(plan.breakfastCount) : "",
		lunchCount: plan?.lunchCount ? String(plan.lunchCount) : "",
		teaCount: plan?.teaCount ? String(plan.teaCount) : "",
		dinnerCount: plan?.dinnerCount ? String(plan.dinnerCount) : "",
		snacksCount: plan?.snacksCount ? String(plan.snacksCount) : "",
		notes: plan?.notes ?? "",
	});

	useEffect(() => {
		setForm({
			mealDate: plan?.mealDate ?? "",
			breakfastCount: plan?.breakfastCount ? String(plan.breakfastCount) : "",
			lunchCount: plan?.lunchCount ? String(plan.lunchCount) : "",
			teaCount: plan?.teaCount ? String(plan.teaCount) : "",
			dinnerCount: plan?.dinnerCount ? String(plan.dinnerCount) : "",
			snacksCount: plan?.snacksCount ? String(plan.snacksCount) : "",
			notes: plan?.notes ?? "",
		});
	}, [plan]);
	const save = useMutation({
		mutationFn: () => {
			const parseCount = (s: string) => {
				if (!s || s.trim() === "") return undefined;
				const n = Number(s);
				if (Number.isNaN(n)) return undefined;
				return Math.max(0, Math.trunc(n));
			};

			const body = {
				mealDate: form.mealDate,
				breakfastCount: parseCount(form.breakfastCount),
				lunchCount: parseCount(form.lunchCount),
				teaCount: parseCount(form.teaCount),
				dinnerCount: parseCount(form.dinnerCount),
				snacksCount: parseCount(form.snacksCount),
				notes: form.notes || undefined,
			};
			return isEdit
				? api.patch(`/api/v1/c/${conference.slug}/food/plans/${plan!.id}`, body)
				: api.post(`/api/v1/c/${conference.slug}/food/plans`, body);
		},
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.foodPlans(conference.slug) }).catch(
				console.error,
			);
			toast.success(isEdit ? "Meal plan updated" : "Meal plan added");
			onClose();
		},
		onError: (e: any) => toast.error("Save failed", e.message),
	});

	const del = useMutation({
		mutationFn: () => api.del(`/api/v1/c/${conference.slug}/food/plans/${plan!.id}`),
		onSuccess: () => {
			qc.invalidateQueries({ queryKey: queryKeys.foodPlans(conference.slug) }).catch(
				console.error,
			);
			toast.success("Meal plan deleted");
			onClose();
		},
		onError: (e: any) => toast.error("Delete failed", e.message),
	});

	return (
		<EntityDrawer
			open
			onOpenChange={v => !v && onClose()}
			title={isEdit ? `Edit meal plan` : "Add meal plan"}
			width="sm"
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
										title: `Delete meal plan?`,
										description: `The meal plan for ${form.mealDate} will be permanently deleted.`,
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
							disabled={!form.mealDate.trim()}
							onClick={() => save.mutate()}
						>
							{isEdit ? "Update" : "Create"}
						</Button>
					</div>
				</>
			}
		>
			<div className="space-y-4">
				<FieldRow label="Date" required>
					<DatePickerInput
						value={form.mealDate}
						onChange={e => setForm(p => ({ ...p, mealDate: e || p.mealDate }))}
					/>
				</FieldRow>
				<div className="grid grid-cols-2 gap-2">
					<FieldRow label="Breakfast">
						<Input
							type="number"
							value={form.breakfastCount}
							onChange={e => setForm(p => ({ ...p, breakfastCount: e.target.value }))}
						/>
					</FieldRow>
					<FieldRow label="Lunch">
						<Input
							type="number"
							value={form.lunchCount}
							onChange={e => setForm(p => ({ ...p, lunchCount: e.target.value }))}
						/>
					</FieldRow>
					<FieldRow label="Tea">
						<Input
							type="number"
							value={form.teaCount}
							onChange={e => setForm(p => ({ ...p, teaCount: e.target.value }))}
						/>
					</FieldRow>
					<FieldRow label="Dinner">
						<Input
							type="number"
							value={form.dinnerCount}
							onChange={e => setForm(p => ({ ...p, dinnerCount: e.target.value }))}
						/>
					</FieldRow>
					<FieldRow label="Snacks">
						<Input
							type="number"
							value={form.snacksCount}
							onChange={e => setForm(p => ({ ...p, snacksCount: e.target.value }))}
						/>
					</FieldRow>
				</div>
				<FieldRow label="Notes">
					<Textarea
						value={form.notes}
						onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
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

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const controlsRef = useRef<IScannerControls | null>(null);
	const submittingRef = useRef(false);
	const lastScanRef = useRef<{ code: string; at: number } | null>(null);

	const [cameraOpen, setCameraOpen] = useState(false);
	const [cameraError, setCameraError] = useState<string | null>(null);
	const [scanFeedback, setScanFeedback] = useState<string | null>(null);

	const [form, setForm] = useState({
		attendeeCode: "",
		mealDate: new Date().toISOString().slice(0, 10),
		mealType: "lunch",
	});

	const scan = useMutation({
		mutationFn: (overrideCode?: string) => {
			const attendeeCode = (overrideCode ?? form.attendeeCode).trim();

			return api.post(`/api/v1/c/${conference.slug}/food/scans`, {
				attendeeCode,
				mealDate: form.mealDate,
				mealType: form.mealType,
			});
		},
		onSuccess: (_data, overrideCode) => {
			const scannedCode = overrideCode ?? form.attendeeCode;
			lastScanRef.current = { code: scannedCode, at: Date.now() };

			qc.invalidateQueries({ queryKey: queryKeys.mealScanStats(conference.slug) }).catch(
				console.error,
			);
			toast.success("Scan recorded", `${scannedCode} · ${form.mealType}`);
			setScanFeedback(`Added ${scannedCode} · ${form.mealType}`);
			setForm(p => ({ ...p, attendeeCode: "" }));
		},
		onError: (err: any) => {
			if (err instanceof ApiError && err.status === 409) {
				toast.warn("Already scanned", "This attendee was already scanned for this meal.");
			} else if (err instanceof ApiError && err.status === 400) {
				toast.error("Invalid code", "The attendee code is not valid.");
			} else {
				toast.error("Scan failed", err.message);
				return;
			}
		},
		onSettled: () => {
			submittingRef.current = false;
		},
	});

	const stopCamera = () => {
		controlsRef.current?.stop();
		controlsRef.current = null;
		setCameraOpen(false);
	};

	const submitCode = (code: string) => {
		const attendeeCode = code.trim();
		if (!attendeeCode || submittingRef.current) return;

		const lastScan = lastScanRef.current;
		if (lastScan && lastScan.code === attendeeCode && Date.now() - lastScan.at < 2500) {
			return;
		}

		submittingRef.current = true;
		setScanFeedback(null);
		setForm(p => ({ ...p, attendeeCode }));

		scan.mutate(attendeeCode);
	};

	const startCamera = async () => {
		setCameraError(null);
		setCameraOpen(true);

		try {
			const hints = new Map();
			hints.set(DecodeHintType.POSSIBLE_FORMATS, [
				BarcodeFormat.QR_CODE,
				BarcodeFormat.CODE_128,
				BarcodeFormat.CODE_39,
				BarcodeFormat.EAN_13,
			]);

			const reader = new BrowserMultiFormatReader(hints);
			await new Promise(requestAnimationFrame);
			if (!videoRef.current) {
				setCameraError("Scanner is not ready.");
				stopCamera();
				return;
			}

			controlsRef.current = await reader.decodeFromConstraints(
				{ video: { facingMode: { ideal: "environment" } }, audio: false },
				videoRef.current,
				result => {
					const code = result?.getText()?.trim();
					if (code) submitCode(code);
				},
			);
		} catch (err: any) {
			setCameraError(err?.message ?? "Could not start camera scanner.");
			stopCamera();
		}
	};

	useEffect(() => {
		setCameraError(null);
		setScanFeedback(null);

		return () => {
			stopCamera();
		};
	}, []);

	return (
		<EntityDrawer
			open
			onOpenChange={v => {
				if (!v) {
					stopCamera();
					onClose();
				}
			}}
			title="Record meal scan"
			subtitle="Scan or type the attendee code"
			width="sm"
			footer={
				<>
					<Button
						variant="ghost"
						onClick={() => {
							stopCamera();
							onClose();
						}}
					>
						Close
					</Button>
					<Button
						variant="primary"
						loading={scan.isPending}
						disabled={!form.attendeeCode.trim()}
						onClick={() => submitCode(form.attendeeCode)}
						leadingIcon={<QrCode size={13} />}
					>
						Record
					</Button>
				</>
			}
		>
			<div className="space-y-4">
				<FieldRow label="Camera">
					<div className="space-y-3">
						{scanFeedback && (
							<div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
								{scanFeedback}
							</div>
						)}
						{cameraOpen && (
							<div className="overflow-hidden rounded-xl border bg-black">
								<video
									ref={videoRef}
									className="h-64 w-full object-cover"
									muted
									playsInline
								/>
							</div>
						)}
						<div className="flex gap-2">
							{cameraOpen ? (
								<Button
									type="button"
									variant="secondary"
									onClick={stopCamera}
									leadingIcon={<X size={13} />}
								>
									Close camera
								</Button>
							) : (
								<Button
									type="button"
									variant="secondary"
									onClick={startCamera}
									leadingIcon={<Camera size={13} />}
								>
									Open camera scanner
								</Button>
							)}
						</div>
						{cameraError && <p className="text-sm text-red-600">{cameraError}</p>}
					</div>
				</FieldRow>
				<FieldRow label="Attendee code" required>
					<Input
						autoFocus
						value={form.attendeeCode}
						onChange={e => setForm(p => ({ ...p, attendeeCode: e.target.value }))}
						onKeyDown={e => {
							if (e.key === "Enter" && form.attendeeCode.trim())
								submitCode(form.attendeeCode);
						}}
						placeholder="XYZ26-12345"
					/>
				</FieldRow>
				<FieldRow label="Date" required>
					<DatePickerInput
						value={form.mealDate}
						onChange={e => setForm(p => ({ ...p, mealDate: e || p.mealDate }))}
					/>
				</FieldRow>
				<FieldRow label="Meal" required>
					<Select
						value={form.mealType}
						onChange={e => setForm(p => ({ ...p, mealType: e.target.value }))}
					>
						{MEALS.map(m => (
							<option key={m} value={m}>
								{humanise(m)}
							</option>
						))}
					</Select>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}
