import { useEffect, useState } from "react";

import { X } from "lucide-react";

type Field = {
	name: string;
	label?: string;
	type?: "text" | "number" | "textarea" | "select";
	options?: string[];
};

export const EntityDrawer = ({
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
	initial?: Record<string, any> | null;
	fields?: Field[];
	onSave: (row: Record<string, any>) => Promise<void> | void;
	onCancel: () => void;
	onDelete?: () => Promise<void> | void;
}) => {
	const [form, setForm] = useState<Record<string, any>>(initial || {});

	useEffect(() => {
		setForm(initial || {});
	}, [initial]);

	if (!open) return null;

	return (
		<div className="fixed inset-0 z-40 flex">
			<div className="absolute inset-0 bg-black/30" onClick={onCancel} />
			<aside className="ml-auto w-full max-w-md bg-white p-4 shadow-lg">
				<div className="mb-4 flex items-center justify-between">
					<h3 className="text-lg font-semibold">{title || "Edit"}</h3>
					<button
						onClick={onCancel}
						className="rounded p-1 text-zinc-600 hover:bg-gray-100"
					>
						<X size={16} />
					</button>
				</div>

				<div className="space-y-3">
					{fields.map(field => {
						const val = form[field.name] ?? "";
						if (field.type === "textarea") {
							return (
								<div key={field.name}>
									<label className="mb-1 block text-xs text-zinc-600">
										{field.label || field.name}
									</label>
									<textarea
										className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
										value={val}
										onChange={e =>
											setForm({ ...form, [field.name]: e.target.value })
										}
									/>
								</div>
							);
						}

						if (field.type === "select") {
							return (
								<div key={field.name}>
									<label className="mb-1 block text-xs text-zinc-600">
										{field.label || field.name}
									</label>
									<select
										className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
										value={val}
										onChange={e =>
											setForm({ ...form, [field.name]: e.target.value })
										}
									>
										<option value="">--</option>
										{(field.options || []).map(opt => (
											<option key={opt} value={opt}>
												{opt}
											</option>
										))}
									</select>
								</div>
							);
						}

						return (
							<div key={field.name}>
								<label className="mb-1 block text-xs text-zinc-600">
									{field.label || field.name}
								</label>
								<input
									className="w-full rounded border border-gray-200 px-3 py-2 text-sm"
									type={field.type === "number" ? "number" : "text"}
									value={val}
									onChange={e =>
										setForm({
											...form,
											[field.name]:
												field.type === "number"
													? e.target.value === ""
														? ""
														: Number(e.target.value)
													: e.target.value,
										})
									}
								/>
							</div>
						);
					})}
				</div>

				<div className="mt-4 flex justify-between">
					<div className="flex gap-2">
						{onDelete && (
							<button
								onClick={async () => {
									if (confirm("Delete this item?")) await onDelete();
								}}
								className="rounded bg-red-50 px-3 py-2 text-sm text-red-600 hover:bg-red-100"
							>
								Delete
							</button>
						)}
					</div>
					<div className="flex gap-2">
						<button
							onClick={onCancel}
							className="rounded border border-gray-200 px-3 py-2 text-sm"
						>
							Cancel
						</button>
						<button
							onClick={async () => {
								await onSave(form);
							}}
							className="rounded bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700"
						>
							Save
						</button>
					</div>
				</div>
			</aside>
		</div>
	);
};

export default EntityDrawer;
