import {
	forwardRef,
	type InputHTMLAttributes,
	type SelectHTMLAttributes,
	type TextareaHTMLAttributes,
} from "react";

import { cx, input as inputCls, textarea as textareaCls } from "@/lib/uiStyles";

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
			<select
				ref={ref}
				className={cx(inputCls, "pr-8 appearance-none cursor-pointer", className)}
				{...rest}
			>
				{children}
			</select>
		);
	},
);
