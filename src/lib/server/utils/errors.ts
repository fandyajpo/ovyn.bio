/**
 * Application error with an HTTP status and a user-safe message.
 * Messages are safe to show to users - never include internals.
 */
export class AppError extends Error {
	constructor(
		public status: number,
		message: string,
		public code?: string
	) {
		super(message);
		this.name = 'AppError';
	}
}

export class ConflictError extends AppError {
	constructor(message: string, code?: string) {
		super(409, message, code ?? 'conflict');
		this.name = 'ConflictError';
	}
}

export class ForbiddenError extends AppError {
	constructor(message = 'You are not allowed to do that') {
		super(403, message, 'forbidden');
		this.name = 'ForbiddenError';
	}
}

export class NotFoundError extends AppError {
	constructor(message = 'Not found') {
		super(404, message, 'not_found');
		this.name = 'NotFoundError';
	}
}

export class ValidationError extends AppError {
	constructor(message = 'Invalid input') {
		super(422, message, 'validation_error');
		this.name = 'ValidationError';
	}
}

/** Is the error a Postgres unique-constraint violation? */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
	const e = err as { code?: string; constraint?: string };
	if (e?.code !== '23505') return false;
	if (!constraint) return true;
	return e.constraint === constraint;
}
