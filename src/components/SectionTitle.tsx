export const SectionTitle = ({ title, subtitle }: { title: string; subtitle?: string }) => (
	<div className="mb-5">
		<h1 className="text-xl font-semibold text-zinc-900">{title}</h1>
		{subtitle && <p className="mt-1 text-sm text-zinc-600">{subtitle}</p>}
	</div>
);
