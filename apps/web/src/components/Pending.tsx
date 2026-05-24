import { CenterSpinner } from "@/components/EmptyState";

export function Pending() {
	return (
		<div className="min-h-screen bg-app text-ink flex items-center justify-center p-6">
			<CenterSpinner />
		</div>
	);
}
