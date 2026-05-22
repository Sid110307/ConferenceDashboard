import { format, formatDistanceToNowStrict, isValid, parseISO } from "date-fns";

export function fmtDate(input: string | Date | null | undefined, fmt = "d MMM yyyy"): string {
	if (!input) return "—";
	const d = typeof input === "string" ? parseISO(input) : input;
	if (!isValid(d)) return "—";
	return format(d, fmt);
}

export function fmtDateTime(input: string | Date | null | undefined): string {
	if (!input) return "—";
	const d = typeof input === "string" ? parseISO(input) : input;
	if (!isValid(d)) return "—";
	return format(d, "d MMM yyyy · HH:mm");
}

export function fmtTime(input: string | Date | null | undefined): string {
	if (!input) return "—";
	const d = typeof input === "string" ? parseISO(input) : input;
	if (!isValid(d)) return "—";
	return format(d, "HH:mm");
}

export function fmtRelative(input: string | Date | null | undefined): string {
	if (!input) return "—";
	const d = typeof input === "string" ? parseISO(input) : input;
	if (!isValid(d)) return "—";
	return `${formatDistanceToNowStrict(d, { addSuffix: true })}`;
}

export function fmtINR(amount: number | string | null | undefined): string {
	if (amount == null || amount === "") return "—";
	const n = typeof amount === "string" ? Number(amount) : amount;
	if (!Number.isFinite(n)) return "—";
	return new Intl.NumberFormat("en-IN", {
		style: "currency",
		currency: "INR",
		maximumFractionDigits: 0,
	}).format(n);
}

export function fmtNumber(value: number | null | undefined): string {
	if (value == null || !Number.isFinite(value)) return "—";
	return new Intl.NumberFormat("en-IN").format(value);
}

export function fmtPercent(value: number | null | undefined, digits = 1): string {
	if (value == null || !Number.isFinite(value)) return "—";
	return `${value.toFixed(digits)}%`;
}

export function initials(name: string | null | undefined): string {
	if (!name) return "?";
	return name
		.split(/\s+/)
		.filter(Boolean)
		.slice(0, 2)
		.map(s => s[0]!.toUpperCase())
		.join("");
}

export function truncate(s: string | null | undefined, n: number): string {
	if (!s) return "";
	return s.length > n ? s.slice(0, n - 1) + "..." : s;
}

export function humanise(s: string | null | undefined): string {
	if (!s) return "";
	return s.replace(/[_-]+/g, " ").replace(/\b\w/g, c => c.toUpperCase());
}
