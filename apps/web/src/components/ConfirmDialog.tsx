import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

import { cx } from "@/lib/uiStyles";
import * as Dialog from "@radix-ui/react-dialog";

import { Button } from "@/components/Button";

type ConfirmOpts = {
	title: ReactNode;
	description?: ReactNode;
	confirmLabel?: string;
	cancelLabel?: string;
	tone?: "primary" | "danger";
};

type ConfirmFn = (opts: ConfirmOpts) => Promise<boolean>;

const Ctx = createContext<ConfirmFn | null>(null);

export function ConfirmProvider({ children }: { children: ReactNode }) {
	const [open, setOpen] = useState(false);
	const [opts, setOpts] = useState<ConfirmOpts | null>(null);
	const [resolver, setResolver] = useState<((v: boolean) => void) | null>(null);

	const confirm = useCallback<ConfirmFn>(
		o =>
			new Promise<boolean>(resolve => {
				setOpts(o);
				setResolver(() => resolve);
				setOpen(true);
			}),
		[],
	);

	const finish = (v: boolean) => {
		resolver?.(v);
		setOpen(false);
		setTimeout(() => {
			setOpts(null);
			setResolver(null);
		}, 200);
	};

	return (
		<Ctx.Provider value={confirm}>
			{children}
			<Dialog.Root open={open} onOpenChange={v => !v && finish(false)}>
				<Dialog.Portal>
					<Dialog.Overlay className="fixed inset-0 z-40 bg-ink/35 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
					<Dialog.Content
						className={cx(
							"fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50",
							"bg-surface border border-line rounded-lg shadow-pop p-5",
							"w-[440px] max-w-[92vw]",
							"data-[state=open]:animate-in data-[state=open]:zoom-in-95 data-[state=open]:fade-in-0",
						)}
					>
						<Dialog.Title className="text-base font-semibold text-ink">
							{opts?.title}
						</Dialog.Title>
						{opts?.description && (
							<Dialog.Description className="mt-2 text-sm text-ink-2 leading-relaxed">
								{opts.description}
							</Dialog.Description>
						)}
						<div className="mt-5 flex items-center justify-end gap-2">
							<Button variant="ghost" onClick={() => finish(false)}>
								{opts?.cancelLabel ?? "Cancel"}
							</Button>
							<Button
								variant={opts?.tone === "danger" ? "danger" : "primary"}
								onClick={() => finish(true)}
							>
								{opts?.confirmLabel ?? "Confirm"}
							</Button>
						</div>
					</Dialog.Content>
				</Dialog.Portal>
			</Dialog.Root>
		</Ctx.Provider>
	);
}

export function useConfirm(): ConfirmFn {
	const ctx = useContext(Ctx);
	if (!ctx) throw new Error("useConfirm must be inside <ConfirmProvider>");
	return ctx;
}
