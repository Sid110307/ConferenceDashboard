import React, { type ComponentType } from "react";

import { CountUpNumber } from "@/components/CountUpNumber.tsx";

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
	const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
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
			className={`flex items-start gap-3 rounded-xl border border-gray-200 bg-white p-4 transition-colors ${
				isInteractive ? "cursor-pointer hover:bg-gray-50" : ""
			} ${isLink ? "cursor-pointer hover:bg-gray-50" : ""}`}
		>
			<div className={`shrink-0 rounded-lg p-2 ${ICON_COLORS[color]}`}>
				<Icon size={18} aria-hidden />
			</div>
			<div className="min-w-0">
				<div className="mb-0.5 text-xs text-zinc-600">{label}</div>
				<div className="text-3xl font-semibold leading-none text-zinc-900">
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
