const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";

export class ApiError extends Error {
	readonly status: number;
	readonly code?: string;
	readonly details?: unknown;
	readonly requestId?: string;
	constructor(opts: {
		status: number;
		message: string;
		code?: string;
		details?: unknown;
		requestId?: string;
	}) {
		super(opts.message);
		this.name = "ApiError";
		this.status = opts.status;
		this.code = opts.code;
		this.details = opts.details;
		this.requestId = opts.requestId;
	}
}

type ErrorPayload = {
	message?: string;
	error?: string;
	details?: unknown;
	requestId?: string;
};

function newRequestId() {
	const t = Date.now().toString(36);
	const r = Math.random().toString(36).slice(2, 10);
	return `web-${t}-${r}`;
}

export type ApiRequest = {
	method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
	path: string;
	query?: Record<string, string | number | boolean | undefined | null>;
	body?: unknown;
	headers?: Record<string, string>;
	signal?: AbortSignal;
};

function buildUrl(path: string, query?: ApiRequest["query"]) {
	const usp = new URLSearchParams();
	if (query) {
		for (const [k, v] of Object.entries(query)) {
			if (v == null || v === "") continue;
			usp.set(k, String(v));
		}
	}
	const qs = usp.toString();
	const sep = qs ? (path.includes("?") ? "&" : "?") : "";
	return `${API_BASE}${path}${sep}${qs}`;
}

export async function api<T = unknown>(req: ApiRequest): Promise<T> {
	const requestId = newRequestId();
	const headers: Record<string, string> = {
		"x-request-id": requestId,
		"Accept": "application/json",
		...(req.headers ?? {}),
	};
	const init: RequestInit = {
		method: req.method ?? "GET",
		credentials: "include",
		headers,
		signal: req.signal,
	};
	if (req.body !== undefined && !(req.body instanceof FormData)) {
		headers["Content-Type"] = "application/json";
		init.body = JSON.stringify(req.body);
	} else if (req.body instanceof FormData) {
		init.body = req.body;
	}

	const res = await fetch(buildUrl(req.path, req.query), init);
	const isJson = res.headers.get("content-type")?.includes("application/json");
	const payload = isJson ? await res.json().catch(() => null) : await res.text();

	if (!res.ok) {
		const errBody = (
			payload && typeof payload === "object" ? payload : null
		) as ErrorPayload | null;
		throw new ApiError({
			status: res.status,
			message: errBody?.message ?? res.statusText ?? "Request failed",
			code: errBody?.error,
			details: errBody?.details,
			requestId: errBody?.requestId ?? requestId,
		});
	}
	return payload as T;
}

api.get = <T = unknown>(path: string, query?: ApiRequest["query"]) =>
	api<T>({ method: "GET", path, query });
api.post = <T = unknown>(path: string, body?: unknown) => api<T>({ method: "POST", path, body });
api.patch = <T = unknown>(path: string, body?: unknown) => api<T>({ method: "PATCH", path, body });
api.put = <T = unknown>(path: string, body?: unknown) => api<T>({ method: "PUT", path, body });
api.del = <T = unknown>(path: string, query?: ApiRequest["query"]) =>
	api<T>({ method: "DELETE", path, query });
