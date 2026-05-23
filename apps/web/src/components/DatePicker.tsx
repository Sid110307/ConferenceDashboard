import { useState } from "react";
import { DayPicker } from "react-day-picker";

import { cx } from "@/lib/uiStyles";
import * as Popover from "@radix-ui/react-popover";
import { format, isValid, parseISO } from "date-fns";
import { CalendarDays, ChevronDown, X } from "lucide-react";

import { Button } from "@/components/Button";

const parseDateValue = (value?: string): Date | undefined => {
	if (!value) return undefined;
	const date = parseISO(value);
	return isValid(date) ? date : undefined;
};

const formatDateValue = (date?: Date): string | undefined =>
	date ? format(date, "yyyy-MM-dd") : undefined;

export function DatePickerInput({
	value,
	onChange,
	placeholder = "Pick date",
	className,
	disabled,
	clearable = true,
}: {
	value?: string;
	onChange: (value: string | undefined) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	clearable?: boolean;
}) {
	const [open, setOpen] = useState(false);
	const selected = parseDateValue(value);

	return (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger asChild>
				<Button
					type="button"
					variant="secondary"
					disabled={disabled}
					className={cx(
						"h-9 justify-start gap-2 px-3 text-left font-normal",
						!selected && "text-ink-3",
						className,
					)}
				>
					<CalendarDays size={15} className="shrink-0 text-ink-3" />
					<span className="min-w-0 flex-1 truncate tabular-nums">
						{selected ? format(selected, "dd MMM yyyy") : placeholder}
					</span>
					<ChevronDown size={14} className="shrink-0 text-ink-3" />
				</Button>
			</Popover.Trigger>

			<Popover.Portal>
				<Popover.Content
					align="start"
					sideOffset={6}
					className={cx(
						"z-50 rounded-lg border border-line bg-surface shadow-pop",
						"data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95",
					)}
				>
					<DayPicker
						mode="single"
						selected={selected}
						onSelect={date => {
							onChange(formatDateValue(date));
							if (date) setOpen(false);
						}}
						showOutsideDays
						className="p-3"
						classNames={{
							months: "flex flex-col gap-4",
							month: "space-y-3",
							month_caption: "flex items-center justify-center h-8 px-8",
							caption_label: "text-sm font-semibold text-ink",
							nav: "absolute inset-x-3 top-3 flex items-center justify-between",
							button_previous: cx(
								"size-8 inline-flex items-center justify-center rounded-md",
								"text-ink-2 hover:text-ink hover:bg-surface-2",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
							),
							button_next: cx(
								"size-8 inline-flex items-center justify-center rounded-md",
								"text-ink-2 hover:text-ink hover:bg-surface-2",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
							),
							month_grid: "w-full border-collapse space-y-1",
							weekdays: "flex",
							weekday:
								"w-9 text-[11px] font-medium text-ink-3 uppercase tracking-wide text-center",
							week: "flex w-full mt-1",
							day: "size-9 text-center text-sm p-0 relative",
							day_button: cx(
								"size-9 rounded-md inline-flex items-center justify-center",
								"text-sm text-ink hover:bg-surface-2",
								"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30",
							),
							today: "font-semibold",
							selected:
								"[&>button]:bg-accent [&>button]:text-accent-fg [&>button]:hover:bg-accent",
							outside: "opacity-40",
							disabled: "opacity-40 pointer-events-none",
							hidden: "invisible",
						}}
					/>

					{clearable && selected && (
						<div className="border-t border-line p-2 flex justify-end">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								leadingIcon={<X size={13} />}
								onClick={() => {
									onChange(undefined);
									setOpen(false);
								}}
							>
								Clear
							</Button>
						</div>
					)}
				</Popover.Content>
			</Popover.Portal>
		</Popover.Root>
	);
}
