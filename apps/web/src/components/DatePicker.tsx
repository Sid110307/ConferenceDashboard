import { useState } from "react";
import { DayPicker } from "react-day-picker";

import { cx } from "@/lib/uiStyles";
import * as Popover from "@radix-ui/react-popover";
import { format, isValid, parseISO, setHours, setMinutes, setSeconds } from "date-fns";
import { CalendarDays, ChevronDown, X } from "lucide-react";

import { Button } from "@/components/Button";
import { Input } from "@/components/Input";

type DatePickerMode = "date" | "datetime";

const parseDateValue = (value?: string): Date | undefined => {
	if (!value) return undefined;
	const date = parseISO(value);
	return isValid(date) ? date : undefined;
};

const formatDateValue = (date?: Date, mode: DatePickerMode = "date"): string | undefined => {
	if (!date) return undefined;

	if (mode === "datetime") {
		return date.toISOString();
	}

	return format(date, "yyyy-MM-dd");
};

const formatTimeValue = (date?: Date): string => {
	if (!date) return "09:00";
	return format(date, "HH:mm");
};

function applyTime(date: Date, time: string): Date {
	const [hoursRaw, minutesRaw] = time.split(":");
	const hours = Number(hoursRaw);
	const minutes = Number(minutesRaw);

	if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
		return date;
	}

	return setSeconds(setMinutes(setHours(date, hours), minutes), 0);
}

export function DatePickerInput({
	value,
	onChange,
	placeholder = "Pick date",
	className,
	disabled,
	clearable = true,
	mode = "date",
	timePlaceholder = "Time",
	defaultTime = "09:00",
}: {
	value?: string;
	onChange: (value: string | undefined) => void;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
	clearable?: boolean;
	mode?: DatePickerMode;
	timePlaceholder?: string;
	defaultTime?: string;
}) {
	const [open, setOpen] = useState(false);
	const selected = parseDateValue(value);

	const timeValue = selected ? formatTimeValue(selected) : defaultTime;

	const handleDateSelect = (date?: Date) => {
		if (!date) {
			onChange(undefined);
			return;
		}

		const next =
			mode === "datetime"
				? applyTime(date, selected ? formatTimeValue(selected) : defaultTime)
				: date;

		onChange(formatDateValue(next, mode));
		setOpen(false);
	};

	const handleTimeChange = (time: string) => {
		const base = selected ?? new Date();
		const next = applyTime(base, time);

		onChange(formatDateValue(next, mode));
	};

	const dateButton = (
		<Popover.Root open={open} onOpenChange={setOpen}>
			<Popover.Trigger asChild>
				<Button
					type="button"
					variant="secondary"
					disabled={disabled}
					className={cx(
						"h-9 justify-start gap-2 px-3 text-left font-normal",
						mode === "datetime" ? "w-full min-w-0" : "w-full",
						!selected && "text-ink-3",
						mode === "date" && className,
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
						onSelect={handleDateSelect}
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

	return mode === "datetime" ? (
		<div className={cx("grid grid-cols-[minmax(0,1fr)_8.5rem] gap-2", className)}>
			{dateButton}
			<Input
				type="time"
				value={timeValue}
				disabled={disabled}
				placeholder={timePlaceholder}
				onChange={e => handleTimeChange(e.target.value)}
				className={cx(
					"h-9 tabular-nums",
					"appearance-none",
					"[&::-webkit-calendar-picker-indicator]:hidden",
					"[&::-webkit-calendar-picker-indicator]:appearance-none",
				)}
			/>
		</div>
	) : (
		dateButton
	);
}
