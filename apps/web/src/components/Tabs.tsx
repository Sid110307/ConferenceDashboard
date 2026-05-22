import type { ReactNode } from "react";

import { cx } from "@/lib/uiStyles";
import * as TabsPrim from "@radix-ui/react-tabs";

export function Tabs({
	value,
	onValueChange,
	items,
	className,
}: {
	value: string;
	onValueChange: (v: string) => void;
	items: { value: string; label: ReactNode; content: ReactNode }[];
	className?: string;
}) {
	return (
		<TabsPrim.Root value={value} onValueChange={onValueChange} className={className}>
			<TabsPrim.List className="flex gap-1 border-b border-line mb-4 -mx-1 px-1">
				{items.map(i => (
					<TabsPrim.Trigger
						key={i.value}
						value={i.value}
						className={cx(
							"px-3 h-9 text-sm font-medium rounded-t-md -mb-px border-b-2 transition-colors",
							"text-ink-2 border-transparent hover:text-ink",
							"data-[state=active]:text-ink data-[state=active]:border-accent",
							"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
						)}
					>
						{i.label}
					</TabsPrim.Trigger>
				))}
			</TabsPrim.List>
			{items.map(i => (
				<TabsPrim.Content key={i.value} value={i.value} className="outline-none">
					{i.content}
				</TabsPrim.Content>
			))}
		</TabsPrim.Root>
	);
}
