import type { ReactNode } from "react";

import { cx, pageH1 } from "@/lib/uiStyles";

export function PageHeader({
	title,
	description,
	actions,
	className,
}: {
	title: ReactNode;
	description?: ReactNode;
	actions?: ReactNode;
	className?: string;
}) {
	return (
		<div className={cx("flex items-start justify-between gap-4 mb-5", className)}>
			<div className="min-w-0">
				<h1 className={pageH1}>{title}</h1>
				{description && (
					<div className="mt-1 text-sm text-ink-2 max-w-3xl">{description}</div>
				)}
			</div>
			{actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
		</div>
	);
}
