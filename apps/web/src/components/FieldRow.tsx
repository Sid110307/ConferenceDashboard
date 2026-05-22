import type { ReactNode } from "react";

import { cx, fieldGroup, label as labelCls } from "@/lib/uiStyles";

export function Label({
	htmlFor,
	required,
	children,
	className,
}: {
	htmlFor?: string;
	required?: boolean;
	children: ReactNode;
	className?: string;
}) {
	return (
		<label htmlFor={htmlFor} className={cx(labelCls, className)}>
			{children}
			{required && <span className="text-danger ml-0.5">*</span>}
		</label>
	);
}

export function FieldRow({
	label,
	htmlFor,
	required,
	hint,
	error,
	children,
	className,
}: {
	label?: ReactNode;
	htmlFor?: string;
	required?: boolean;
	hint?: ReactNode;
	error?: ReactNode;
	children: ReactNode;
	className?: string;
}) {
	return (
		<div className={cx(fieldGroup, className)}>
			{label && (
				<Label htmlFor={htmlFor} required={required}>
					{label}
				</Label>
			)}
			{children}
			{error ? (
				<div className="text-xs text-danger-soft-fg">{error}</div>
			) : hint ? (
				<div className="text-xs text-ink-3">{hint}</div>
			) : null}
		</div>
	);
}
