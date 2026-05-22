import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

export type ListEnvelope<T> = {
	data: T[];
	page: number;
	pageSize: number;
	total: number;
};

export function useListQuery<T>(opts: {
	key: readonly unknown[];
	path: string;
	params?: Record<string, string | number | boolean | undefined | null>;
	enabled?: boolean;
	staleTime?: number;
}) {
	return useQuery<ListEnvelope<T>>({
		queryKey: [...opts.key, opts.params ?? {}],
		queryFn: () => api.get<ListEnvelope<T>>(opts.path, opts.params),
		enabled: opts.enabled ?? true,
		staleTime: opts.staleTime ?? 15000,
		placeholderData: prev => prev,
	});
}
