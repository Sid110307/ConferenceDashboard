import { clsx } from "clsx";

export const card = "bg-surface border border-line rounded-lg shadow-card";

export const padCard = "p-5";
export const padCardSm = "p-3.5";
export const padCardLg = "p-7";

export const sectionLabel = "text-[11px] font-semibold uppercase tracking-wider text-ink-3";

export const pageH1 = "text-2xl font-semibold text-ink leading-tight";
export const pageH2 = "text-base font-semibold text-ink leading-tight";

const btnBase =
	"inline-flex items-center justify-center gap-2 font-medium rounded-md cursor-pointer " +
	"transition-colors transition-shadow duration-150 ease-[var(--ease-out)] " +
	"disabled:opacity-50 disabled:cursor-not-allowed select-none whitespace-nowrap " +
	"focus-visible:outline-2 focus-visible:outline-offset-2";

export const btnSize = {
	xs: "h-7 px-2.5 text-xs",
	sm: "h-8 px-3 text-[13px]",
	md: "h-9 px-4 text-sm",
	lg: "h-11 px-5 text-sm",
};

export const btn = {
	primary: clsx(
		btnBase,
		"bg-accent text-accent-fg shadow-sm",
		"hover:brightness-105 active:brightness-95",
		"focus-visible:outline-accent",
	),
	secondary: clsx(
		btnBase,
		"bg-surface text-ink border border-line shadow-card",
		"hover:bg-surface-2 active:bg-surface-3",
		"focus-visible:outline-accent",
	),
	ghost: clsx(
		btnBase,
		"bg-transparent text-ink-2",
		"hover:bg-surface-2 hover:text-ink active:bg-surface-3",
		"focus-visible:outline-accent",
	),
	danger: clsx(
		btnBase,
		"bg-danger text-white shadow-sm",
		"hover:brightness-105 active:brightness-95",
		"focus-visible:outline-danger",
	),
	icon: clsx(
		btnBase,
		"bg-transparent text-ink-2 px-2",
		"hover:bg-surface-2 hover:text-ink active:bg-surface-3",
		"focus-visible:outline-accent",
	),
};

export const input =
	"h-9 w-full px-3 text-sm bg-surface text-ink rounded-md " +
	"border border-line shadow-card " +
	"placeholder:text-ink-3 " +
	"disabled:opacity-50 disabled:cursor-not-allowed";

export const textarea =
	"min-h-[88px] w-full px-3 py-2 text-sm bg-surface text-ink rounded-md " +
	"border border-line shadow-card " +
	"placeholder:text-ink-3 leading-relaxed";

export const label = "text-[11px] font-semibold uppercase tracking-wider text-ink-3";

export const fieldGroup = "flex flex-col gap-1.5";

export const table = {
	wrap: "bg-surface border border-line rounded-lg overflow-hidden",
	scroll: "overflow-x-auto",
	root: "w-full text-sm",
	head: "bg-surface-3 text-[11px] font-semibold uppercase tracking-wider text-ink-3",
	headCell: "px-4 py-2.5 text-left whitespace-nowrap border-b border-line",
	row: "border-b border-line last:border-b-0 hover:bg-surface-2 transition-colors",
	rowSelected: "bg-accent-soft/40",
	cell: "px-4 py-3 text-ink align-middle",
	cellMuted: "px-4 py-3 text-ink-2 align-middle",
	cellNumeric: "px-4 py-3 text-ink tabular-nums align-middle",
};

export const BADGE_VARIANTS = {
	neutral: "bg-neutral-soft text-neutral-soft-fg border border-line-2",
	accent: "bg-accent-soft text-accent-soft-fg border border-accent/15",
	success: "bg-success-soft text-success-soft-fg border border-success/15",
	warn: "bg-warn-soft text-warn-soft-fg border border-warn/15",
	danger: "bg-danger-soft text-danger-soft-fg border border-danger/15",
	info: "bg-info-soft text-info-soft-fg border border-info/15",
	outline: "bg-transparent text-ink-2 border border-line-2",
} as const;
export type BadgeVariant = keyof typeof BADGE_VARIANTS;

export const kbd =
	"inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 " +
	"text-[11px] font-mono text-ink-2 bg-surface-2 border border-line " +
	"rounded shadow-card";
export const emptyState = "flex flex-col items-center justify-center gap-2 py-12 text-center";

export { clsx as cx };
