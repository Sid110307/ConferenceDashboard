import { useCallback } from "react";

import { useNavigate, useRouterState, useSearch } from "@tanstack/react-router";

export function useUrlState<T extends Record<string, any>>(): [T, (patch: Partial<T>) => void] {
	const navigate = useNavigate();
	const search = useSearch({ strict: false }) as T;
	const pathname = useRouterState({ select: s => s.location.pathname });

	const set = useCallback(
		(patch: Partial<T>) => {
			navigate({
				to: pathname,
				search: (prev: any) => {
					const next: any = { ...prev };
					for (const [k, v] of Object.entries(patch)) {
						if (v === undefined || v === null || v === "") {
							delete next[k];
						} else {
							next[k] = v;
						}
					}
					return next;
				},
				replace: true,
			});
		},
		[navigate, pathname],
	);

	return [search, set];
}
