import type { ReactNode } from "react";

import { VARIANTS } from "@/core/data";

type BadgeProps = {
	children: ReactNode;
	variant?: string;
};

export const Badge = ({ children, variant = "gray" }: BadgeProps) => (
	<span
		className={`inline-flex items-center rounded-full border px-2.5! py-0.5! text-xs font-medium tracking-tight ${VARIANTS[variant] || VARIANTS.gray}`}
	>
		{children}
	</span>
);
