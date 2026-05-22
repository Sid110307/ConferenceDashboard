import type { ReactNode } from "react";

import { card, cx, padCard, padCardLg, padCardSm } from "@/lib/uiStyles";

type Pad = "sm" | "md" | "lg" | "none";

export function Card({
	title,
	icon,
	subtitle,
	actions,
	pad = "md",
	className,
	children,
}: {
	title?: ReactNode;
	icon?: ReactNode;
	subtitle?: ReactNode;
	actions?: ReactNode;
	pad?: Pad;
	className?: string;
	children?: ReactNode;
}) {
	const padCls =
		pad === "none" ? "" : pad === "sm" ? padCardSm : pad === "lg" ? padCardLg : padCard;
	return (
		<div className={cx(card, className)}>
			{(title || actions) && (
				<header className={cx("flex items-start justify-between gap-3", padCls, "pb-3")}>
					<div className="min-w-0 flex items-start gap-2">
						{icon && <div className="mt-0.5 shrink-0 text-ink-2">{icon}</div>}
						<div className="min-w-0">
							{title && (
								<h2 className="text-sm font-semibold text-ink leading-tight">
									{title}
								</h2>
							)}
							{subtitle && (
								<div className="mt-0.5 text-xs text-ink-3">{subtitle}</div>
							)}
						</div>
					</div>
					{actions && <div className="flex items-center gap-2">{actions}</div>}
				</header>
			)}
			<div className={cx(padCls, (title || actions) && "pt-0")}>{children}</div>
		</div>
	);
}
