import { ApiError } from "@/lib/api";
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 30000,
			gcTime: 5 * 60000,
			retry: (failureCount, err) => {
				if (err instanceof ApiError && err.status < 500) return false;
				return failureCount < 2;
			},
			refetchOnWindowFocus: false,
		},
		mutations: {
			retry: false,
		},
	},
});
