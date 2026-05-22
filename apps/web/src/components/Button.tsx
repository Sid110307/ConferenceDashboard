import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { btn, btnSize, cx } from "@/lib/uiStyles";
import { Loader2 } from "lucide-react";

type Variant = keyof typeof btn;
type Size = keyof typeof btnSize;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: Variant;
	size?: Size;
	loading?: boolean;
	leadingIcon?: ReactNode;
	trailingIcon?: ReactNode;
};

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
	{
		variant = "secondary",
		size = "md",
		loading,
		leadingIcon,
		trailingIcon,
		className,
		children,
		disabled,
		...rest
	},
	ref,
) {
	return (
		<button
			ref={ref}
			disabled={disabled || loading}
			className={cx(btn[variant], btnSize[size], className)}
			{...rest}
		>
			{loading ? (
				<Loader2 size={14} className="animate-spin" />
			) : (
				leadingIcon && <span className="shrink-0">{leadingIcon}</span>
			)}
			{children}
			{trailingIcon && <span className="shrink-0">{trailingIcon}</span>}
		</button>
	);
});
