export const ProgressBar = ({
	value,
	max,
	color = "blue",
}: {
	value: number;
	max: number;
	color?: string;
}) => {
	const pct = Math.min(100, Math.round((value / max) * 100));
	const bar = {
		blue: "bg-blue-500",
		green: "bg-green-500",
		yellow: "bg-amber-500",
		red: "bg-red-500",
	}[color];

	return (
		<div className="flex items-center gap-3">
			<div className="h-2 flex-1 rounded-md bg-gray-200">
				<div className={`${bar} h-2 rounded-md`} style={{ width: `${pct}%` }} />
			</div>
			<span className="w-10 text-right text-xs text-zinc-700">{pct}%</span>
		</div>
	);
};
