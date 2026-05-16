import type { KeyboardEvent, ReactNode } from "react";

interface CardProps {
	children: ReactNode;
	className?: string;
	onClick?: () => void;
}

export const Card = ({ children, className = "", onClick }: CardProps) => {
	const isInteractive = typeof onClick === "function";

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
			className={`overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm transition-all ${isInteractive ? "cursor-pointer hover:border-gray-200 hover:shadow-md" : ""} ${className}`}
		>
			{children}
		</div>
	);
};

export const CardHead = ({ title, extra }: { title: string; extra?: ReactNode }) => (
	<div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-5">
		<span className="text-sm font-semibold tracking-tight text-zinc-900">{title}</span>
		{extra}
	</div>
);
