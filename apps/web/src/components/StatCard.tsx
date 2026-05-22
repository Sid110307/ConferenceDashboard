import type { ReactNode } from "react";

import { card, cx } from "@/lib/uiStyles";

type Trend = "up" | "down" | "flat" | null;

export function StatCard({
	label,
	value,
	hint,
	icon,
	trend,
	delta,
	tone = "neutral",
	className,
	onClick,
}: {
	label: ReactNode;
	value: ReactNode;
	hint?: ReactNode;
	icon?: ReactNode;
	trend?: Trend;
	delta?: ReactNode;
	tone?: "neutral" | "accent" | "success" | "warn" | "danger";
	className?: string;
	onClick?: () => void;
}) {
	const accentBg: Record<typeof tone, string> = {
		neutral: "bg-neutral-soft text-neutral-soft-fg",
		accent: "bg-accent-soft text-accent-soft-fg",
		success: "bg-success-soft text-success-soft-fg",
		warn: "bg-warn-soft text-warn-soft-fg",
		danger: "bg-danger-soft text-danger-soft-fg",
	};
	const trendColor =
		trend === "up"
			? "text-success-soft-fg"
			: trend === "down"
				? "text-danger-soft-fg"
				: "text-ink-3";

	const Wrapper = onClick ? "button" : "div";
	return (
		<Wrapper
			onClick={onClick}
			className={cx(
				card,
				"p-4 flex items-start gap-3 text-left",
				onClick && "hover:bg-surface-2 transition-colors cursor-pointer w-full",
				className,
			)}
		>
			{icon && (
				<div
					className={cx(
						"shrink-0 size-10 rounded-md flex items-center justify-center",
						accentBg[tone],
					)}
				>
					{icon}
				</div>
			)}
			<div className="min-w-0 flex-1">
				<div className="text-[11px] font-semibold uppercase tracking-wider text-ink-3">
					{label}
				</div>
				<div className="mt-0.5 text-2xl font-semibold text-ink leading-tight tabular-nums">
					{value}
				</div>
				{(hint || delta) && (
					<div className={cx("mt-1 text-xs flex items-center gap-2", trendColor)}>
						{trend === "up" && <span aria-hidden>▲</span>}
						{trend === "down" && <span aria-hidden>▼</span>}
						{delta != null && <span>{delta}</span>}
						{hint != null && <span className="text-ink-3">{hint}</span>}
					</div>
				)}
			</div>
		</Wrapper>
	);
}
