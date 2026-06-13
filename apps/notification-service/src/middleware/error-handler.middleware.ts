import type { ErrorRequestHandler, NextFunction, Request, Response } from "express";

import type { LoggerPort } from "../utils/logger/logger.types.js";

function extractHttpStatus(err: unknown): number {
    if (typeof err !== "object" || err === null) return 500;
    const e = err as Record<string, unknown>;
    const code = e.status ?? e.statusCode;
    return typeof code === "number" && code >= 400 && code < 600 ? code : 500;
}

export function createErrorHandlerMiddleware(logger: LoggerPort): ErrorRequestHandler {
    return (err: unknown, req: Request, res: Response, _next: NextFunction): void => {
        const status = extractHttpStatus(err);

        if (status < 500) {
            const message = err instanceof Error ? err.message : "Request error";
            res.status(status).json({ error: message });
            return;
        }

        logger.error("Unhandled request error", err, {
            method: req.method,
            path: req.path,
            requestId: res.locals.requestId as string | undefined,
        });
        res.status(500).json({ error: "Internal server error" });
    };
}
