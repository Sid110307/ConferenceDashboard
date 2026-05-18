import { useEffect, useState } from "react";

import { X } from "lucide-react";

import {
	dangerButtonClassName,
	fieldClassName,
	fieldWithPlaceholderClassName,
	primaryButtonClassName,
	secondaryButtonClassName,
} from "@/components/uiStyles";

import { formatLabel } from "@/core/display";

type Field = {
	name: string;
	label?: string;
	type?: "text" | "number" | "textarea" | "select";
	options?: string[];
};

export const EntityDrawer = <TForm extends Record<string, unknown>>({
	open,
	title,
	initial = {},
	fields = [],
	onSave,
	onCancel,
	onDelete,
}: {
	open: boolean;
	title?: string;
	initial?: Partial<TForm> | null;
	fields?: Field[];
	onSave: (row: Partial<TForm>) => Promise<void> | void;
	onCancel: () => void;
	onDelete?: () => Promise<void> | void;
}) => {
	const [form, setForm] = useState<Partial<TForm>>(initial || {});

	useEffect(() => {
		if (open) {
			setForm(initial || {});
		}
	}, [open, initial]);

	if (!open) return null;

	const handleFieldChange = (fieldName: string, value: unknown) => {
		setForm({ ...form, [fieldName]: value } as Partial<TForm>);
	};

	return (
		<div className="fixed inset-0 z-40 flex">
			<div
				className="absolute inset-0 bg-zinc-950/25 backdrop-blur-[2px]"
				onClick={onCancel}
			/>
			<aside
				className="relative ml-auto flex h-full w-full max-w-md flex-col border-l border-gray-100 bg-white shadow-2xl sm:rounded-l-xl"
				role="dialog"
				aria-modal="true"
				aria-labelledby="drawer-title"
			>
				<div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
					<h3 className="text-base font-semibold tracking-tight text-zinc-900">
						{title || "Edit"}
					</h3>
					<button
						onClick={onCancel}
						className="-mr-1 rounded-md p-1.5 text-zinc-500 transition-colors hover:bg-gray-100 hover:text-zinc-900"
					>
						<X size={16} />
					</button>
				</div>

				<div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
					{fields.map(field => {
						const rawValue = form[field.name as keyof TForm];
						const textValue = rawValue == null ? "" : String(rawValue);

						if (field.type === "textarea") {
							return (
								<div key={field.name}>
									<label className="mb-1.5 block text-sm font-medium text-zinc-700">
										{field.label || field.name}
									</label>
									<textarea
										className={`${fieldWithPlaceholderClassName} min-h-24`}
										value={textValue}
										onChange={e =>
											handleFieldChange(field.name, e.target.value)
										}
									/>
								</div>
							);
						}

						if (field.type === "select") {
							return (
								<div key={field.name}>
									<label className="mb-1.5 block text-sm font-medium text-zinc-700">
										{field.label || field.name}
									</label>
									<select
										className={fieldClassName}
										value={textValue}
										onChange={e =>
											handleFieldChange(field.name, e.target.value)
										}
									>
										<option value="">--</option>
										{(field.options || []).map(opt => (
											<option key={opt} value={opt}>
												{formatLabel(opt)}
											</option>
										))}
									</select>
								</div>
							);
						}

						return (
							<div key={field.name}>
								<label className="mb-1.5 block text-sm font-medium text-zinc-700">
									{field.label || field.name}
								</label>
								<input
									className={
										field.type === "number"
											? fieldClassName
											: fieldWithPlaceholderClassName
									}
									type={field.type === "number" ? "number" : "text"}
									value={
										field.type === "number"
											? rawValue == null || rawValue === ""
												? ""
												: Number(rawValue)
											: textValue
									}
									onChange={e => {
										const val =
											field.type === "number"
												? e.target.value === ""
													? ""
													: Number(e.target.value)
												: e.target.value;
										handleFieldChange(field.name, val);
									}}
								/>
							</div>
						);
					})}
				</div>

				<div className="border-t border-gray-100 px-5 py-4">
					<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
						<div className="flex gap-2">
							{onDelete && (
								<button
									onClick={async () => {
										if (confirm("Delete this item?")) await onDelete();
									}}
									className={dangerButtonClassName}
								>
									Delete
								</button>
							)}
						</div>
						<div className="flex gap-2">
							<button
								onClick={onCancel}
								className={`${secondaryButtonClassName} flex-1 sm:flex-none`}
							>
								Cancel
							</button>
							<button
								onClick={async () => {
									await onSave(form);
								}}
								className={`${primaryButtonClassName} flex-1 sm:flex-none`}
							>
								Save
							</button>
						</div>
					</div>
				</div>
			</aside>
		</div>
	);
};

export default EntityDrawer;
