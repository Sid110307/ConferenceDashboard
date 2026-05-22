import { type ReactNode } from "react";

import { btn, cx } from "@/lib/uiStyles";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";

export function EntityDrawer({
	open,
	onOpenChange,
	title,
	subtitle,
	status,
	footer,
	width = "md",
	children,
}: {
	open: boolean;
	onOpenChange: (v: boolean) => void;
	title: ReactNode;
	subtitle?: ReactNode;
	status?: ReactNode;
	footer?: ReactNode;
	width?: "sm" | "md" | "lg" | "xl";
	children?: ReactNode;
}) {
	const widths = {
		sm: "w-[420px]",
		md: "w-[560px]",
		lg: "w-[720px]",
		xl: "w-[920px]",
	} as const;
	return (
		<Dialog.Root open={open} onOpenChange={onOpenChange}>
			<Dialog.Portal>
				<Dialog.Overlay
					className={cx(
						"fixed inset-0 z-40 bg-ink/35 backdrop-blur-[1.5px]",
						"data-[state=open]:animate-in data-[state=open]:fade-in-0",
						"data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
					)}
				/>
				<Dialog.Content
					className={cx(
						"fixed top-0 right-0 z-50 h-full",
						widths[width],
						"max-w-[100vw] bg-surface border-l border-line shadow-pop",
						"flex flex-col",
						"data-[state=open]:animate-in data-[state=open]:slide-in-from-right-12",
						"data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-12",
					)}
				>
					<header className="px-5 py-4 border-b border-line flex items-start justify-between gap-3">
						<div className="min-w-0 flex-1">
							<Dialog.Title className="text-base font-semibold text-ink leading-tight truncate">
								{title}
							</Dialog.Title>
							{subtitle && (
								<div className="mt-0.5 text-xs text-ink-3 truncate">{subtitle}</div>
							)}
							{status && <div className="mt-2">{status}</div>}
						</div>
						<Dialog.Close className={btn.icon} aria-label="Close">
							<X size={16} />
						</Dialog.Close>
					</header>

					<div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>

					{footer && (
						<footer className="px-5 py-3 border-t border-line bg-surface-2 flex items-center justify-end gap-2">
							{footer}
						</footer>
					)}
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
