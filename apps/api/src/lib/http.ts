import type { Context } from "hono";

export function getClientIp(c: Context): string | null {
	return (
		c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ?? c.req.header("x-real-ip") ?? null
	);
}

export function buildPagination(params: { page: number; pageSize: number; total: number }) {
	return {
		page: params.page,
		pageSize: params.pageSize,
		total: params.total,
		totalPages: Math.max(1, Math.ceil(params.total / params.pageSize)),
		hasNextPage: params.page * params.pageSize < params.total,
	};
}
