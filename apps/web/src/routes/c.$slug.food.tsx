import { useEffect, useRef, useState } from "react";

import { api, ApiError } from "@/lib/api";
import { hasAtLeastRole, useConference } from "@/lib/ConferenceContext";
import { fmtDate } from "@/lib/format";
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
import { Input, Select } from "@/components/Input";
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

const MEALS = ["breakfast", "lunch", "dinner", "snacks"] as const;

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

			<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
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
	const initialExpected = plan
		? Math.max(
				plan.breakfastCount,
				plan.lunchCount,
				plan.teaCount,
				plan.dinnerCount,
				plan.snacksCount,
			)
		: 0;
	const [form, setForm] = useState({
		mealDate: plan?.mealDate ?? "",
		expectedHeadcount: initialExpected > 0 ? String(initialExpected) : "",
		notes: plan?.notes ?? "",
	});
	const save = useMutation({
		mutationFn: () => {
			const parsedExpected = Number(form.expectedHeadcount);
			const expectedHeadcount =
				form.expectedHeadcount.trim() === "" || Number.isNaN(parsedExpected)
					? undefined
					: Math.max(0, Math.trunc(parsedExpected));
			const body = {
				mealDate: form.mealDate,
				breakfastCount: expectedHeadcount,
				lunchCount: expectedHeadcount,
				teaCount: expectedHeadcount,
				dinnerCount: expectedHeadcount,
				snacksCount: expectedHeadcount,
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

	const videoRef = useRef<HTMLVideoElement | null>(null);
	const controlsRef = useRef<IScannerControls | null>(null);
	const submittingRef = useRef(false);

	const [cameraOpen, setCameraOpen] = useState(false);
	const [cameraError, setCameraError] = useState<string | null>(null);

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

			qc.invalidateQueries({ queryKey: queryKeys.mealScanStats(conference.slug) }).catch(
				console.error,
			);
			toast.success("Scan recorded", `${scannedCode} · ${form.mealType}`);
			setForm(p => ({ ...p, attendeeCode: "" }));
		},
		onError: (err: any) => {
			if (err instanceof ApiError && err.status === 409) {
				toast.warn("Already scanned", "This attendee was already scanned for this meal.");
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

		submittingRef.current = true;
		setForm(p => ({ ...p, attendeeCode }));

		stopCamera();
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
			if (!videoRef.current) throw new Error("Scanner is not ready.");

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
									variant="ghost"
									onClick={stopCamera}
									leadingIcon={<X size={13} />}
								>
									Stop camera
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
						placeholder="DNC26-00042"
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
								{m}
							</option>
						))}
					</Select>
				</FieldRow>
			</div>
		</EntityDrawer>
	);
}
