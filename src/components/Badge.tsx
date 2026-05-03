import type { ReactNode } from "react";

import { VARIANTS } from "@/core/data";

type BadgeProps = {
	children: ReactNode;
	variant?: string;
};

export const Badge = ({ children, variant = "gray" }: BadgeProps) => (
	<span
		className={`inline-block rounded border px-1.5 py-0.5 text-xs font-medium ${VARIANTS[variant] || VARIANTS.gray}`}
	>
		{children}
	</span>
);
