import type { NextFunction, Request, Response } from "express";

import type { MetricsHttpPort } from "../services/metrics/metrics.types.js";
import { elapsedSeconds } from "../utils/hrtime.js";

const KNOWN_METHODS = new Set(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]);

function normalizeMethod(method: string): string {
    const upper = method.toUpperCase();
    return KNOWN_METHODS.has(upper) ? upper : "OTHER";
}

const SKIP_PATHS = new Set(["/api/metrics", "/api/health"]);

export function createHttpMetricsMiddleware(metrics: MetricsHttpPort) {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (SKIP_PATHS.has(req.path)) {
            next();
            return;
        }

        const method = normalizeMethod(req.method);
        const startNs = process.hrtime.bigint();

        metrics.incrementHttpInFlight(method);

        let settled = false;
        const releaseInFlight = () => {
            if (settled) return;
            settled = true;
            metrics.decrementHttpInFlight(method);
        };

        res.on("finish", () => {
            const durationSeconds = elapsedSeconds(startNs);
            const route = req.route ? `${req.baseUrl}${(req.route as { path: string }).path}` : "unknown";

            releaseInFlight();
            metrics.recordHttpRequest(method, route, String(res.statusCode), durationSeconds);
        });

        res.on("close", releaseInFlight);

        next();
    };
}
