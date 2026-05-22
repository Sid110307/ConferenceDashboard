import type { ReactNode } from "react";

import { cx } from "@/lib/uiStyles";
import { X } from "lucide-react";

export function FilterChip({
	label,
	value,
	onClear,
	icon,
}: {
	label: string;
	value: ReactNode;
	onClear: () => void;
	icon?: ReactNode;
}) {
	return (
		<span
			className={cx(
				"inline-flex items-center gap-1.5 h-7 pl-2 pr-1 rounded-md",
				"bg-accent-soft text-accent-soft-fg text-xs font-medium border border-accent/15",
			)}
		>
			{icon && <span>{icon}</span>}
			<span className="text-ink-3">{label}:</span>
			<span className="text-ink">{value}</span>
			<button
				onClick={onClear}
				className="inline-flex items-center justify-center size-5 rounded hover:bg-accent/15"
				aria-label={`Clear ${label} filter`}
			>
				<X size={11} />
			</button>
		</span>
	);
}

export function Toolbar({
	left,
	right,
	className,
}: {
	left?: ReactNode;
	right?: ReactNode;
	className?: string;
}) {
	return (
		<div className={cx("flex flex-wrap items-center justify-between gap-2 mb-3", className)}>
			<div className="flex flex-wrap items-center gap-2">{left}</div>
			<div className="flex flex-wrap items-center gap-2">{right}</div>
		</div>
	);
}
