import type { ComponentType, KeyboardEvent } from "react";

import { CountUpNumber } from "@/components/CountUpNumber";

import { ICON_COLORS } from "@/core/data";

type StatCardProps = {
	icon: ComponentType<{ "size"?: number; "aria-hidden"?: boolean }>;
	label: string;
	value: string | number;
	sub?: string;
	color?: string;
	onClick?: () => void;
	isLink?: boolean;
};

export const StatCard = ({
	icon: Icon,
	label,
	value,
	sub,
	color = "blue",
	onClick,
	isLink = false,
}: StatCardProps) => {
	const isInteractive = typeof onClick === "function" && !isLink;
	const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
		if (!isInteractive) return;
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onClick?.();
		}
	};

	return (
		<div
			role={isInteractive ? "button" : undefined}
			tabIndex={isInteractive ? 0 : undefined}
			onKeyDown={handleKeyDown}
			onClick={onClick}
			className={`flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all sm:p-5 ${isInteractive || isLink ? "cursor-pointer hover:border-gray-200 hover:shadow-md" : ""}`}
		>
			<div
				className={`shrink-0 rounded-lg border border-transparent p-2.5 ${ICON_COLORS[color]}`}
			>
				<Icon size={18} aria-hidden />
			</div>
			<div className="min-w-0">
				<div className="mb-1 text-xs font-medium text-zinc-500">{label}</div>
				<div className="text-[1.7rem] font-semibold leading-none tracking-tight text-zinc-900">
					{typeof value === "number" && Number.isFinite(value) ? (
						<CountUpNumber value={value} />
					) : (
						value
					)}
				</div>
				<div className="mt-1 min-h-4 text-xs text-zinc-500">{sub}</div>
			</div>
		</div>
	);
};
