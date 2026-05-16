type TooltipItem = {
	name: string;
	value: number | string;
	color: string;
};

export const CustomTooltip = ({
	active,
	payload,
	label,
}: {
	active?: boolean;
	payload?: TooltipItem[];
	label?: string;
}) => {
	if (!active || !payload?.length) {
		return null;
	}

	return (
		<div className="rounded-md bg-white p-4 text-sm shadow-md">
			<p className="mb-1 font-medium text-zinc-900">{label}</p>
			{payload.map((item, index) => (
				<p key={index} style={{ color: item.color }}>
					{item.name}:{" "}
					{typeof item.value === "number" ? item.value.toLocaleString() : item.value}
				</p>
			))}
		</div>
	);
};
