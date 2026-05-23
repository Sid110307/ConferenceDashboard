import { useEffect, useRef, useState } from "react";

import { cx } from "@/lib/uiStyles";
import { Search, X } from "lucide-react";

export function SearchField({
	value,
	onChange,
	placeholder = "Search...",
	debounceMs = 500,
	className,
	autoFocus,
}: {
	value: string;
	onChange: (v: string) => void;
	placeholder?: string;
	debounceMs?: number;
	className?: string;
	autoFocus?: boolean;
}) {
	const [local, setLocal] = useState(value);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		setLocal(value);
	}, [value]);

	const push = (v: string) => {
		if (timer.current) clearTimeout(timer.current);
		timer.current = setTimeout(() => onChange(v), debounceMs);
	};

	return (
		<div className={cx("relative", className)}>
			<Search
				size={14}
				className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none"
			/>
			<input
				autoFocus={autoFocus}
				value={local}
				onChange={e => {
					setLocal(e.target.value);
					push(e.target.value);
				}}
				placeholder={placeholder}
				className={cx(
					"h-9 w-full pl-8 pr-8 text-sm bg-surface text-ink rounded-md",
					"border border-line shadow-card placeholder:text-ink-3",
					"focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent",
				)}
			/>
			{local && (
				<button
					type="button"
					onClick={() => {
						setLocal("");
						onChange("");
					}}
					className="absolute right-1.5 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded text-ink-3 hover:bg-surface-2 hover:text-ink"
					aria-label="Clear search"
				>
					<X size={12} />
				</button>
			)}
		</div>
	);
}
