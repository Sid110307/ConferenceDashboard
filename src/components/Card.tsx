import type { ReactNode } from "react";

interface CardProps {
	children: ReactNode;
	className?: string;
	onClick?: () => void;
}

export const Card = ({ children, className = "", onClick }: CardProps) => {
	const isInteractive = typeof onClick === "function";

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
			className={`rounded-xl border border-gray-200 bg-white ${isInteractive ? "cursor-pointer" : ""} ${className}`}
		>
			{children}
		</div>
	);
};

export const CardHead = ({ title, extra }: { title: string; extra?: ReactNode }) => (
	<div className="flex items-center justify-between border-b border-gray-200 px-5 py-3">
		<span className="text-sm font-medium text-zinc-900">{title}</span>
		{extra}
	</div>
);
