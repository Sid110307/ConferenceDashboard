import type { ReactNode } from "react";

import { card, cx, padCard, padCardLg, padCardSm } from "@/lib/uiStyles";

type Pad = "sm" | "md" | "lg" | "none";

export function Card({
	title,
	icon,
	subtitle,
	actions,
	pad = "md",
	largeIcon,
	className,
	onClick,
	children,
}: {
	title?: ReactNode;
	icon?: ReactNode;
	subtitle?: ReactNode;
	actions?: ReactNode;
	pad?: Pad;
	largeIcon?: boolean;
	className?: string;
	onClick?: () => void;
	children?: ReactNode;
}) {
	const Wrapper = onClick ? "button" : "div";
	const padCls =
		pad === "none" ? "" : pad === "sm" ? padCardSm : pad === "lg" ? padCardLg : padCard;
	return (
		<Wrapper
			className={cx(
				card,
				onClick ? "cursor-pointer hover:bg-ink-50 active:bg-ink-100" : "",
				className,
			)}
			onClick={onClick}
		>
			{(title || actions) && (
				<header className={cx("flex items-start justify-between gap-3", padCls, "pb-3")}>
					<div className="min-w-0 flex items-start gap-2">
						{icon && (
							<div
								className={cx(
									"shrink-0 rounded-md flex items-center justify-center",
									largeIcon ? "size-10 bg-accent-soft mr-1" : "size-6",
								)}
							>
								{icon}
							</div>
						)}
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
		</Wrapper>
	);
}
