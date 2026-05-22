import type { ReactNode } from "react";

import { cx, emptyState } from "@/lib/uiStyles";
import { Loader2 } from "lucide-react";

export function EmptyState({
	icon,
	title,
	hint,
	action,
	className,
}: {
	icon?: ReactNode;
	title: ReactNode;
	hint?: ReactNode;
	action?: ReactNode;
	className?: string;
}) {
	return (
		<div className={cx(emptyState, className)}>
			{icon && <div className="text-ink-3 mb-1">{icon}</div>}
			<div className="text-sm font-semibold text-ink">{title}</div>
			{hint && <div className="text-xs text-ink-3 max-w-sm">{hint}</div>}
			{action && <div className="mt-3">{action}</div>}
		</div>
	);
}

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
	return <Loader2 size={size} className={cx("animate-spin text-ink-3", className)} />;
}

export function CenterSpinner({ label }: { label?: string }) {
	return (
		<div className="flex flex-col items-center justify-center gap-2 py-12">
			<Spinner size={20} />
			{label && <div className="text-xs text-ink-3">{label}</div>}
		</div>
	);
}
