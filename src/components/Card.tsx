import type { KeyboardEvent, ReactNode } from "react";

interface CardProps {
	children: ReactNode;
	className?: string;
	onClick?: () => void;
}

const baseTokens = (className: string) =>
	className.split(/\s+/).filter(token => token && !token.includes(":"));

const hasBorderWidthOverride = (className: string) =>
	baseTokens(className).some(token => token === "border-0" || token === "border-none");

const hasBorderColorOverride = (className: string) =>
	baseTokens(className).some(
		token =>
			token.startsWith("border-") &&
			!/^border(?:-[trblxy])?$/.test(token) &&
			!/^border-(?:0|2|4|8|solid|dashed|dotted|double|none)$/.test(token),
	);

const hasBackgroundOverride = (className: string) =>
	baseTokens(className).some(token => token.startsWith("bg-"));

export const Card = ({ children, className = "", onClick }: CardProps) => {
	const isInteractive = typeof onClick === "function";
	const borderClasses = hasBorderWidthOverride(className)
		? ""
		: `border${hasBorderColorOverride(className) ? "" : " border-gray-100"}`;
	const backgroundClass = hasBackgroundOverride(className) ? "" : "bg-white";

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
			className={`overflow-hidden rounded-xl ${borderClasses} ${backgroundClass} shadow-sm transition-all ${isInteractive ? "cursor-pointer hover:border-gray-200 hover:shadow-md" : ""} ${className}`}
		>
			{children}
		</div>
	);
};

export const CardHead = ({ title, extra }: { title: string; extra?: ReactNode }) => (
	<div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
		<span className="text-sm font-semibold tracking-tight text-zinc-900">{title}</span>
		{extra}
	</div>
);
