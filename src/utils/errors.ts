export enum ErrorCodes {
    VALIDATION_ERROR = "VALIDATION_ERROR",
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND",
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT",
    RATE_LIMITED = "RATE_LIMITED",
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR",
    INTERNAL_ERROR = "INTERNAL_ERROR",
}

export class AppError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string,
        public readonly code: ErrorCodes,
        public readonly details?: Record<string, unknown>,
    ) {
        super(message);
        this.name = "AppError";
        Error.captureStackTrace(this, this.constructor);
    }

    static validation(message: string, details?: Record<string, unknown>): AppError {
        return new AppError(400, message, ErrorCodes.VALIDATION_ERROR, details);
    }

    static notFound(message: string = "Resource not found"): AppError {
        return new AppError(404, message, ErrorCodes.RESOURCE_NOT_FOUND);
    }

    static conflict(message: string, details?: Record<string, unknown>): AppError {
        return new AppError(409, message, ErrorCodes.RESOURCE_CONFLICT, details);
    }

    static rateLimited(message: string = "Too many requests"): AppError {
        return new AppError(429, message, ErrorCodes.RATE_LIMITED);
    }

    static external(message: string, details?: Record<string, unknown>): AppError {
        return new AppError(503, message, ErrorCodes.EXTERNAL_SERVICE_ERROR, details);
    }

    static internal(message: string = "Internal server error"): AppError {
        return new AppError(500, message, ErrorCodes.INTERNAL_ERROR);
    }
}
