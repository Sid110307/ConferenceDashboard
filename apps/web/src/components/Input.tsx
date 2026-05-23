import {
	forwardRef,
	type InputHTMLAttributes,
	type SelectHTMLAttributes,
	type TextareaHTMLAttributes,
} from "react";

import { cx, input as inputCls, textarea as textareaCls } from "@/lib/uiStyles";
import { ChevronDown } from "lucide-react";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
	function Input({ className, ...rest }, ref) {
		return <input ref={ref} className={cx(inputCls, className)} {...rest} />;
	},
);

export const Textarea = forwardRef<
	HTMLTextAreaElement,
	TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, ...rest }, ref) {
	return <textarea ref={ref} className={cx(textareaCls, className)} {...rest} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
	function Select({ className, children, ...rest }, ref) {
		return (
			<div className="relative">
				<select
					ref={ref}
					className={cx(inputCls, "pr-10 appearance-none cursor-pointer", className)}
					{...rest}
				>
					{children}
				</select>
				<ChevronDown
					className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 opacity-60"
					aria-hidden="true"
				/>
			</div>
		);
	},
);
