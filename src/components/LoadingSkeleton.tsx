export const PageSkeleton = () => (
	<div className="space-y-6">
		<div className="space-y-2">
			<div className="h-8 w-48 animate-pulse rounded-md bg-gray-200" />
			<div className="h-4 w-96 animate-pulse rounded-md bg-gray-100" />
		</div>
		<div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
			{[...Array(4)].map((_, i) => (
				<div key={i} className="space-y-2 rounded-xl border border-gray-100 bg-white p-4">
					<div className="h-4 w-20 animate-pulse rounded bg-gray-100" />
					<div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
					<div className="h-3 w-24 animate-pulse rounded bg-gray-100" />
				</div>
			))}
		</div>
		<div className="space-y-2 rounded-xl border border-gray-100 bg-white p-4">
			<div className="h-4 w-40 animate-pulse rounded bg-gray-200" />
			<div className="h-48 w-full animate-pulse rounded bg-gray-100" />
		</div>
	</div>
);

export const CardSkeleton = () => (
	<div className="space-y-3 rounded-xl border border-gray-100 bg-white p-4">
		<div className="h-4 w-32 animate-pulse rounded bg-gray-200" />
		<div className="space-y-2">
			{[...Array(3)].map((_, i) => (
				<div key={i} className="h-10 w-full animate-pulse rounded bg-gray-100" />
			))}
		</div>
	</div>
);

export const TableSkeleton = ({ rows = 5 }: { rows?: number }) => (
	<div className="space-y-2">
		{[...Array(rows)].map((_, i) => (
			<div key={i} className="flex gap-4 rounded-md bg-gray-50 p-3">
				{[...Array(4)].map((_, j) => (
					<div key={j} className="h-4 flex-1 animate-pulse rounded bg-gray-200" />
				))}
			</div>
		))}
	</div>
);
