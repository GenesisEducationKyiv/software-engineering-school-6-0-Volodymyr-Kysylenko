import { randomUUID } from "crypto";
import type { NextFunction, Request, Response } from "express";

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const header = req.headers["x-request-id"];
    const raw = (Array.isArray(header) ? header[0] : header)?.trim();
    const requestId = raw !== undefined && raw.length > 0 ? raw : randomUUID();
    res.locals.requestId = requestId;
    res.setHeader("x-request-id", requestId);
    next();
}
