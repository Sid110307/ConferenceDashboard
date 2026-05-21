export class HttpError extends Error {
	constructor(
		public status: number,
		public code: string,
		message: string,
		public details?: Record<string, unknown>,
	) {
		super(message);
		this.name = "HttpError";
	}
}

export class BadRequestError extends HttpError {
	constructor(message = "bad request", details?: Record<string, unknown>) {
		super(400, "bad_request", message, details);
	}
}

export class UnauthorizedError extends HttpError {
	constructor(message = "unauthorized") {
		super(401, "unauthorized", message);
	}
}

export class ForbiddenError extends HttpError {
	constructor(message = "forbidden", details?: Record<string, unknown>) {
		super(403, "forbidden", message, details);
	}
}

export class NotFoundError extends HttpError {
	constructor(entity = "resource") {
		super(404, "not_found", `${entity} not found`);
	}
}

export class ConflictError extends HttpError {
	constructor(message = "conflict", details?: Record<string, unknown>) {
		super(409, "conflict", message, details);
	}
}

export class UnprocessableError extends HttpError {
	constructor(message = "unprocessable", details?: Record<string, unknown>) {
		super(422, "unprocessable", message, details);
	}
}

export class RateLimitedError extends HttpError {
	constructor(retryAfterSeconds?: number) {
		super(429, "rate_limited", "too many requests", {
			retryAfterSeconds,
		});
	}
}

export class InternalError extends HttpError {
	constructor(message = "internal error") {
		super(500, "internal_error", message);
	}
}
