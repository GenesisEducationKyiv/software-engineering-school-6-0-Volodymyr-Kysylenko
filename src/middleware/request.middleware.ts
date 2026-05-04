import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

import type { Logger } from "../utils/logger.js";

declare global {
    namespace Express {
        interface Request {
            requestId: string;
            startTime: number;
        }
    }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    req.requestId = randomUUID();
    req.startTime = Date.now();
    res.setHeader("x-request-id", req.requestId);
    next();
}

export function createRequestLoggerMiddleware(logger: Logger) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const start = Date.now();

        res.on("finish", () => {
            const duration = Date.now() - start;
            const { method, url, ip } = req;
            const { statusCode } = res;

            logger.info("HTTP Request completed", {
                requestId: req.requestId,
                method,
                url,
                statusCode,
                duration,
                ip,
                userAgent: req.get("User-Agent"),
                contentLength: res.get("content-length"),
            });
        });

        logger.info("HTTP Request started", {
            requestId: req.requestId,
            method: req.method,
            url: req.url,
            ip: req.ip,
            userAgent: req.get("User-Agent"),
        });

        next();
    };
}
