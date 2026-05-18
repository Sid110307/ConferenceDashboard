import type { ChangeEventHandler } from "react";

import { Search } from "lucide-react";

type SearchFieldProps = {
	value: string;
	onChange: ChangeEventHandler<HTMLInputElement>;
	placeholder: string;
	className?: string;
};

export const SearchField = ({ value, onChange, placeholder, className = "" }: SearchFieldProps) => (
	<div
		className={`flex min-w-0 flex-1 items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 shadow-sm ${className}`}
	>
		<Search size={14} className="text-zinc-500" />
		<input
			type="text"
			className="w-full bg-transparent text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
			placeholder={placeholder}
			value={value}
			onChange={onChange}
		/>
	</div>
);
