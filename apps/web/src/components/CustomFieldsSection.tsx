import { api } from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";
import { useQuery } from "@tanstack/react-query";

import { DatePickerInput } from "@/components/DatePicker";
import { CenterSpinner } from "@/components/EmptyState";
import { FieldRow } from "@/components/FieldRow";
import { Input, Select, Textarea } from "@/components/Input";

export type CustomFieldDefinition = {
	id: string;
	entity: string;
	fieldKey: string;
	fieldLabel: string;
	fieldType: string;
	isRequired: boolean;
	isUnique?: boolean;
	isVisibleInList?: boolean;
	isSearchable?: boolean;
	defaultValue?: string;
	placeholder?: string;
	helpText?: string;
	options?: Array<{
		value: string;
		label: string;
		color?: string;
	}>;
	validation?: {
		regex?: string;
		min?: number;
		max?: number;
		minLength?: number;
		maxLength?: number;
	};
	groupName?: string;
	sortOrder: number;
	isActive: boolean;
};

type CustomFieldsProps = {
	entity: string;
	conferenceSlug: string;
	customFields: Record<string, unknown>;
	onUpdate: (key: string, value: unknown) => void;
};

export function CustomFieldsSection({
	entity,
	conferenceSlug,
	customFields,
	onUpdate,
}: CustomFieldsProps) {
	const { data, isLoading, error } = useQuery<{ data: CustomFieldDefinition[] }>({
		queryKey: queryKeys.customFields(conferenceSlug, entity),
		queryFn: () =>
			api.get<{ data: CustomFieldDefinition[] }>(
				`/api/v1/c/${conferenceSlug}/custom-fields?entity=${entity}`,
			),
	});

	if (isLoading) return <CenterSpinner />;
	if (error || !data?.data || data.data.length === 0) return null;

	const fields = data.data.filter(f => f.isActive);
	if (fields.length === 0) return null;

	const grouped = fields.reduce(
		(acc, field) => {
			const group = field.groupName || "General";
			if (!acc[group]) acc[group] = [];
			acc[group].push(field);
			return acc;
		},
		{} as Record<string, CustomFieldDefinition[]>,
	);

	return Object.entries(grouped).map(([groupName, groupFields]) => (
		<div key={groupName} className="space-y-4 mb-6">
			{groupName !== "General" && <h3 className="text-sm font-semibold">{groupName}</h3>}
			<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
				{groupFields
					.sort((a, b) => a.sortOrder - b.sortOrder)
					.map(field => (
						<CustomFieldInput
							key={field.id}
							field={field}
							value={customFields[field.fieldKey]}
							onChange={v => onUpdate(field.fieldKey, v)}
						/>
					))}
			</div>
		</div>
	));
}

function CustomFieldInput({
	field,
	value,
	onChange,
}: {
	field: CustomFieldDefinition;
	value?: unknown;
	onChange: (value: unknown) => void;
}) {
	const stringValue = value != null ? String(value) : "";
	const boolValue = value === true || value === "true";

	switch (field.fieldType) {
		case "text":
		case "email":
		case "phone":
		case "url":
			return (
				<FieldRow
					label={field.fieldLabel}
					required={field.isRequired}
					hint={field.helpText}
					className="sm:col-span-2"
				>
					<Input
						type={
							field.fieldType === "email"
								? "email"
								: field.fieldType === "phone"
									? "tel"
									: "text"
						}
						value={stringValue}
						onChange={e => onChange(e.target.value || undefined)}
						placeholder={field.placeholder}
					/>
				</FieldRow>
			);
		case "textarea":
			return (
				<FieldRow
					label={field.fieldLabel}
					required={field.isRequired}
					hint={field.helpText}
					className="sm:col-span-2"
				>
					<Textarea
						value={stringValue}
						onChange={e => onChange(e.target.value || undefined)}
						placeholder={field.placeholder}
					/>
				</FieldRow>
			);
		case "number":
			return (
				<FieldRow
					label={field.fieldLabel}
					required={field.isRequired}
					hint={field.helpText}
					className="sm:col-span-2"
				>
					<Input
						type="number"
						value={stringValue}
						onChange={e =>
							onChange(e.target.value ? Number(e.target.value) : undefined)
						}
						placeholder={field.placeholder}
						min={field.validation?.min}
						max={field.validation?.max}
					/>
				</FieldRow>
			);
		case "date":
			return (
				<FieldRow
					label={field.fieldLabel}
					required={field.isRequired}
					hint={field.helpText}
					className="sm:col-span-2"
				>
					<DatePickerInput
						value={stringValue.slice(0, 10)}
						onChange={v => onChange(v || undefined)}
					/>
				</FieldRow>
			);
		case "datetime":
			return (
				<FieldRow
					label={field.fieldLabel}
					required={field.isRequired}
					hint={field.helpText}
					className="sm:col-span-2"
				>
					<DatePickerInput
						mode="datetime"
						value={stringValue}
						onChange={e => onChange(e || undefined)}
						placeholder={field.placeholder}
					/>
				</FieldRow>
			);
		case "select":
			return (
				<FieldRow
					label={field.fieldLabel}
					required={field.isRequired}
					hint={field.helpText}
					className="sm:col-span-2"
				>
					<Select
						value={stringValue}
						onChange={e => onChange(e.target.value || undefined)}
					>
						<option value="">—</option>
						{field.options?.map(opt => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</Select>
				</FieldRow>
			);
		case "multiselect":
			return (
				<FieldRow
					label={field.fieldLabel}
					required={field.isRequired}
					hint={field.helpText}
					className="sm:col-span-2"
				>
					<Select
						multiple
						value={
							Array.isArray(value)
								? (value.map(String) as string[])
								: value
									? [String(value)]
									: []
						}
						onChange={e => {
							const selected = Array.from(e.target.selectedOptions, opt => opt.value);
							onChange(selected.length > 0 ? selected : undefined);
						}}
						className="flex h-9 w-full rounded border border-ui-3 bg-white px-3 py-1 text-sm placeholder:text-ui-2 focus:border-focus focus:outline-none"
					>
						{field.options?.map(opt => (
							<option key={opt.value} value={opt.value}>
								{opt.label}
							</option>
						))}
					</Select>
				</FieldRow>
			);
		case "checkbox":
			return (
				<FieldRow
					label={field.fieldLabel}
					required={field.isRequired}
					hint={field.helpText}
					className="sm:col-span-2"
				>
					<Select
						value={boolValue ? "true" : "false"}
						onChange={e => onChange(e.target.value === "true")}
					>
						<option value="false">No</option>
						<option value="true">Yes</option>
					</Select>
				</FieldRow>
			);
		default:
			return null;
	}
}
