import { Component, type ReactNode } from "react";

import { AlertCircle } from "lucide-react";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
		console.error("ErrorBoundary caught:", error, errorInfo);
	}

	render() {
		if (this.state.hasError) {
			return (
				this.props.fallback || (
					<div className="rounded-xl border border-red-200 bg-red-50 p-8">
						<div className="flex items-start gap-3">
							<AlertCircle size={24} className="shrink-0 text-red-600" />
							<div>
								<h3 className="font-semibold text-red-900">Something went wrong</h3>
								<p className="mt-1 text-sm text-red-700">
									An error occurred while rendering this component. Please refresh
									the page and try again.
								</p>
								{this.state.error && (
									<pre className="mt-3 overflow-auto rounded bg-red-100 p-2 text-xs text-red-800">
										{this.state.error.toString()}
									</pre>
								)}
							</div>
						</div>
					</div>
				)
			);
		}

		return this.props.children;
	}
}
