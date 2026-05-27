import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { cx } from "@/lib/uiStyles";
import * as Toast from "@radix-ui/react-toast";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastItem = {
	id: string;
	open: boolean;
	variant: "success" | "error" | "info" | "warn";
	title: string;
	description?: string;
	duration?: number;
};

type ToastCtx = {
	push: (t: Omit<ToastItem, "id" | "open">) => void;
	success: (title: string, description?: string) => void;
	error: (title: string, description?: string) => void;
	info: (title: string, description?: string) => void;
	warn: (title: string, description?: string) => void;
};

const Ctx = createContext<ToastCtx | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
	const [items, setItems] = useState<ToastItem[]>([]);

	const push = useCallback<ToastCtx["push"]>(t => {
		const id = Math.random().toString(36).slice(2);
		setItems(prev => [...prev, { ...t, id, open: true }]);
	}, []);
	const close = useCallback((id: string) => {
		setItems(prev => prev.map(t => (t.id === id ? { ...t, open: false } : t)));
	}, []);
	const remove = useCallback((id: string) => {
		setItems(prev => prev.filter(t => t.id !== id));
	}, []);

	const api: ToastCtx = useMemo(
		() => ({
			push,
			success: (title, description) => push({ variant: "success", title, description }),
			error: (title, description) =>
				push({ variant: "error", title, description, duration: 8000 }),
			info: (title, description) => push({ variant: "info", title, description }),
			warn: (title, description) => push({ variant: "warn", title, description }),
		}),
		[push],
	);

	return (
		<Ctx.Provider value={api}>
			<Toast.Provider swipeDirection="right" duration={5000}>
				{children}
				{items.map(t => (
					<Toast.Root
						key={t.id}
						open={t.open}
						duration={t.duration ?? 5000}
						onOpenChange={open => {
							if (!open) close(t.id);
						}}
						onAnimationEnd={e => {
							if (e.currentTarget.dataset.state === "closed") {
								remove(t.id);
							}
						}}
						className={cx(
							"bg-surface border rounded-lg shadow-pop p-3.5 pr-2.5",
							"flex items-start gap-3 min-w-[320px] max-w-[440px]",
							t.variant === "success" && "border-success/30",
							t.variant === "error" && "border-danger/30",
							t.variant === "info" && "border-info/30",
							t.variant === "warn" && "border-warn/30",
							"data-[state=open]:animate-in data-[state=open]:slide-in-from-right-12 data-[state=open]:fade-in-0",
							"data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right-12 data-[state=closed]:fade-out-0",
						)}
					>
						<div
							className={cx(
								"shrink-0 mt-0.5",
								t.variant === "success" && "text-success",
								t.variant === "error" && "text-danger",
								t.variant === "info" && "text-info",
								t.variant === "warn" && "text-warn",
							)}
						>
							{t.variant === "success" && <CheckCircle2 size={18} />}
							{t.variant === "error" && <AlertCircle size={18} />}
							{t.variant === "warn" && <AlertTriangle size={18} />}
							{t.variant === "info" && <Info size={18} />}
						</div>
						<div className="min-w-0 flex-1">
							<Toast.Title className="text-sm font-semibold text-ink">
								{t.title.charAt(0).toUpperCase() + t.title.slice(1)}
							</Toast.Title>
							{t.description && (
								<Toast.Description className="mt-0.5 text-xs text-ink-2">
									{t.description.charAt(0).toUpperCase() + t.description.slice(1)}
								</Toast.Description>
							)}
						</div>
						<Toast.Close className="shrink-0 size-7 inline-flex items-center justify-center text-ink-3 hover:bg-surface-2 hover:text-ink rounded">
							<X size={14} />
						</Toast.Close>
					</Toast.Root>
				))}
				<Toast.Viewport className="fixed top-4 right-4 z-[100] flex flex-col gap-2 outline-none" />
			</Toast.Provider>
		</Ctx.Provider>
	);
}

export function useToast(): ToastCtx {
	const ctx = useContext(Ctx);
	if (!ctx) throw new Error("useToast must be inside <ToastProvider>");
	return ctx;
}
