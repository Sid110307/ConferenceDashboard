import { cx } from "@/lib/uiStyles";

export function ProgressBar({
	value,
	max = 100,
	label,
	hint,
	tone = "accent",
	size = "md",
	className,
}: {
	value: number;
	max?: number;
	label?: string;
	hint?: string;
	tone?: "accent" | "success" | "warn" | "danger" | "info";
	size?: "sm" | "md";
	className?: string;
}) {
	const pct = Math.max(0, Math.min(100, (value / max) * 100));
	const barH = size === "sm" ? "h-1.5" : "h-2";
	const fill: Record<typeof tone, string> = {
		accent: "bg-accent",
		success: "bg-success",
		warn: "bg-warn",
		danger: "bg-danger",
		info: "bg-info",
	};
	return (
		<div className={cx("w-full", className)}>
			{(label || hint) && (
				<div className="flex items-baseline justify-between mb-1 gap-2">
					{label && <span className="text-xs font-medium text-ink-2">{label}</span>}
					{hint != null && (
						<span className="text-xs text-ink-3 tabular-nums">{hint}</span>
					)}
				</div>
			)}
			<div
				className={cx("w-full rounded-full bg-line/70 overflow-hidden", barH)}
				role="progressbar"
				aria-valuenow={Math.round(pct)}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label={label}
			>
				<div
					className={cx(
						"h-full rounded-full transition-[width] duration-300 ease-out",
						fill[tone],
					)}
					style={{ width: `${pct}%` }}
				/>
			</div>
		</div>
	);
}
