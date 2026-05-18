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
	className?: string;
};

const baseTokens = (className: string) =>
	className.split(/\s+/).filter(token => token && !token.includes(":"));

const hasBorderColorOverride = (className: string) =>
	baseTokens(className).some(
		token =>
			token.startsWith("border-") &&
			!/^border(?:-[trblxy])?$/.test(token) &&
			!/^border-(?:0|2|4|8|solid|dashed|dotted|double|none)$/.test(token),
	);

const hasBackgroundOverride = (className: string) =>
	baseTokens(className).some(token => token.startsWith("bg-"));

export const StatCard = ({
	icon: Icon,
	label,
	value,
	sub,
	color = "blue",
	onClick,
	isLink = false,
	className,
}: StatCardProps) => {
	const isInteractive = typeof onClick === "function" && !isLink;
	const extraClassName = className || "";
	const borderColorClass = hasBorderColorOverride(extraClassName) ? "" : "border-gray-100";
	const backgroundClass = hasBackgroundOverride(extraClassName) ? "" : "bg-white";
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
			className={`flex items-start gap-3 rounded-xl border ${borderColorClass} ${backgroundClass} p-4 shadow-sm transition-all sm:p-5 ${isInteractive || isLink ? "cursor-pointer hover:border-gray-200 hover:shadow-md" : ""} ${extraClassName}`}
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
				<div className="mt-2 min-h-4 text-xs text-zinc-500">{sub}</div>
			</div>
		</div>
	);
};
