import type { ErrorComponentProps } from "@tanstack/react-router";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

function getErrorMessage(error: unknown): string {
	if (error instanceof Error) return error.message;
	if (typeof error === "string") return error;

	return "Something went wrong.";
}

export function ErrorBoundary({ error, reset }: ErrorComponentProps) {
	const message = getErrorMessage(error);
	return (
		<div className="min-h-screen bg-app text-ink flex items-center justify-center p-6">
			<Card className="max-w-xl w-full">
				<div className="flex items-start gap-4">
					<div className="rounded-full bg-danger/10 text-danger p-2">
						<AlertTriangle size={22} />
					</div>
					<div className="min-w-0 flex-1">
						<h1 className="text-lg font-semibold text-ink">
							An unexpected error occurred
						</h1>
						<p className="mt-1 text-sm text-ink-2">
							Please try again or refresh the page. If the problem persists, contact
							support with the error details below.
						</p>
						<pre className="mt-4 max-h-48 overflow-auto rounded-md border border-line bg-surface-2 p-3 text-xs text-ink-2 whitespace-pre-wrap">
							{message}
						</pre>
						<div className="mt-5 flex flex-wrap gap-2">
							<Button
								variant="primary"
								leadingIcon={<RefreshCw size={14} />}
								onClick={reset}
							>
								Try again
							</Button>
							<Button variant="secondary" onClick={() => window.location.reload()}>
								Refresh
							</Button>
						</div>
					</div>
				</div>
			</Card>
		</div>
	);
}
