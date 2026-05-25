import type { ReactNode } from "react";

import { humanise } from "@/lib/format";
import { BADGE_VARIANTS, cx, type BadgeVariant } from "@/lib/uiStyles";

type Size = "xs" | "sm" | "md";

const SIZE: Record<Size, string> = {
	xs: "h-[18px] px-1.5 text-[10px]",
	sm: "h-5 px-2 text-[11px]",
	md: "h-6 px-2.5 text-xs",
};

export function Badge({
	variant = "neutral",
	size = "sm",
	leadingIcon,
	children,
	className,
	title,
}: {
	variant?: BadgeVariant;
	size?: Size;
	leadingIcon?: ReactNode;
	children?: ReactNode;
	className?: string;
	title?: string;
}) {
	return (
		<span
			title={title}
			className={cx(
				"inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
				SIZE[size],
				BADGE_VARIANTS[variant],
				className,
			)}
		>
			{leadingIcon && <span className="shrink-0">{leadingIcon}</span>}
			{children}
		</span>
	);
}

export function StatusBadge({ status }: { status: string | null | undefined }) {
	if (!status) return <Badge variant="neutral">—</Badge>;
	const s = status.toLowerCase();
	const map: Record<string, { variant: BadgeVariant; label: string }> = {
		pending: { variant: "warn", label: "Pending" },
		registered: { variant: "info", label: "Registered" },
		confirmed: { variant: "success", label: "Confirmed" },
		cancelled: { variant: "danger", label: "Cancelled" },
		waitlisted: { variant: "neutral", label: "Waitlisted" },

		printed: { variant: "accent", label: "Printed" },
		not_printed: { variant: "neutral", label: "Not printed" },
		collected: { variant: "success", label: "Collected" },
		not_collected: { variant: "neutral", label: "Not collected" },

		not_checked_in: { variant: "neutral", label: "Not checked in" },
		checked_in: { variant: "success", label: "Checked in" },
		checked_out: { variant: "neutral", label: "Checked out" },
		no_show: { variant: "danger", label: "No-show" },

		scheduled: { variant: "info", label: "Scheduled" },
		assigned: { variant: "accent", label: "Assigned" },
		en_route: { variant: "warn", label: "En route" },
		arrived: { variant: "success", label: "Arrived" },
		missed: { variant: "danger", label: "Missed" },
		not_required: { variant: "neutral", label: "No pickup required" },

		open: { variant: "warn", label: "Open" },
		in_progress: { variant: "info", label: "In progress" },
		resolved: { variant: "success", label: "Resolved" },
		closed: { variant: "neutral", label: "Closed" },

		uploaded: { variant: "neutral", label: "Uploaded" },
		mapping: { variant: "neutral", label: "Mapping" },
		previewing: { variant: "info", label: "Previewing..." },
		previewed: { variant: "accent", label: "Previewed" },
		importing: { variant: "info", label: "Importing..." },
		completed: { variant: "success", label: "Completed" },
		with_errors: { variant: "warn", label: "Completed (errors)" },
		failed: { variant: "danger", label: "Failed" },
		rolled_back: { variant: "neutral", label: "Rolled back" },
		rolling_back: { variant: "info", label: "Rolling back..." },

		draft: { variant: "neutral", label: "Draft" },
		materialising: { variant: "info", label: "Materialising..." },
		sending: { variant: "info", label: "Sending" },
		completed_with_errors: { variant: "warn", label: "Completed (errors)" },

		available: { variant: "success", label: "Available" },
		allocated: { variant: "info", label: "Allocated" },
		blocked: { variant: "danger", label: "Blocked" },
	};
	const m = map[s] ?? { variant: "neutral" as BadgeVariant, label: status };
	return <Badge variant={m.variant}>{humanise(m.label)}</Badge>;
}
