import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

import type { ErrorResponse } from "../dto/subscription.dto.js";
import { AppError } from "../utils/errors.js";
import type { Logger } from "../utils/logger.js";

export function createErrorHandler(logger: Logger) {
    return (error: unknown, req: Request, res: Response, _next: NextFunction): void => {
        const requestId = res.getHeader("x-request-id") as string;

        if (error instanceof ZodError) {
            const validationErrors = error.errors.map((err) => ({
                field: err.path.join("."),
                message: err.message,
            }));

            const response: ErrorResponse = {
                message: "Validation failed",
                code: "VALIDATION_ERROR",
                errors: validationErrors,
            };

            logger.warn("Validation error", {
                requestId,
                path: req.path,
                method: req.method,
                errors: validationErrors,
            });

            res.status(400).json(response);
            return;
        }

        if (error instanceof AppError) {
            const response: ErrorResponse = {
                message: error.message,
                code: error.code,
            };

            const logLevel = error.statusCode >= 500 ? "error" : "warn";

            const shouldLog = !(error.statusCode === 404 && error.message === "Route not found");

            if (shouldLog) {
                if (logLevel === "error") {
                    logger.error("Application error", error, {
                        requestId,
                        code: error.code,
                        statusCode: error.statusCode,
                        details: error.details,
                    });
                } else {
                    logger.warn("Client error", {
                        requestId,
                        message: error.message,
                        code: error.code,
                        statusCode: error.statusCode,
                    });
                }
            }

            res.status(error.statusCode).json(response);
            return;
        }

        logger.error("Unhandled error", error, {
            requestId,
            path: req.path,
            method: req.method,
        });

        const response: ErrorResponse = {
            message: "Internal server error",
            code: "INTERNAL_ERROR",
        };

        res.status(500).json(response);
    };
}
