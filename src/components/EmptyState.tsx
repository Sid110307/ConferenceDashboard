import type { ComponentType } from "react";

import { AlertCircle } from "lucide-react";

export const EmptyState = ({
	icon: Icon = AlertCircle,
	title = "No data available",
	description = "No records found matching your filters",
	action,
}: {
	icon?: ComponentType<{ size?: number; className?: string }>;
	title?: string;
	description?: string;
	action?: {
		label: string;
		onClick: () => void;
	};
}) => (
	<div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-8 text-center">
		<div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gray-200">
			<Icon size={24} className="text-gray-600" />
		</div>
		<p className="font-medium text-zinc-900">{title}</p>
		<p className="mt-1 text-sm text-zinc-500">{description}</p>
		{action && (
			<button
				onClick={action.onClick}
				className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
			>
				{action.label}
			</button>
		)}
	</div>
);
