import type { NextFunction, Request, Response } from "express";

import type { MetricsHttpPort } from "../services/metrics/metrics.types.js";
import { elapsedSeconds } from "../utils/hrtime.js";

const UUID_RE = /\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;
const NUMERIC_ID_RE = /\/\d+/g;

function normalizePath(path: string): string {
    return path.replace(UUID_RE, "/:uuid").replace(NUMERIC_ID_RE, "/:id");
}

export function createHttpMetricsMiddleware(metrics: MetricsHttpPort) {
    return (req: Request, res: Response, next: NextFunction): void => {
        const { method } = req;
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
            const route = req.route ? `${req.baseUrl}${(req.route as { path: string }).path}` : normalizePath(req.path);

            releaseInFlight();
            metrics.recordHttpRequest(method, route, String(res.statusCode), durationSeconds);
        });

        res.on("close", releaseInFlight);

        next();
    };
}
