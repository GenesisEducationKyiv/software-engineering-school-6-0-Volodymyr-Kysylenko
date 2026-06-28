import type { NextFunction, Request, Response } from "express";

import { elapsedSeconds } from "../utils/hrtime.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";

export function createRequestLoggerMiddleware(logger: LoggerPort) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const t0 = process.hrtime.bigint();

        res.on("finish", () => {
            logger.info("HTTP request handled", {
                method: req.method,
                path: req.path,
                status: res.statusCode,
                durationMs: Math.round(elapsedSeconds(t0) * 1000),
                requestId: res.locals.requestId as string | undefined,
            });
        });

        next();
    };
}
