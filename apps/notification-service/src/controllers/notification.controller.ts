import type { Request, Response } from "express";

import type { HealthServicePort } from "../health/health.types.js";

export interface NotificationController {
    liveness(this: void, req: Request, res: Response): void;
    readiness(this: void, req: Request, res: Response): void;
}

export interface NotificationControllerDeps {
    healthService: HealthServicePort;
}

export function createNotificationController(deps: NotificationControllerDeps): NotificationController {
    const { healthService } = deps;

    return {
        liveness(this: void, _req: Request, res: Response): void {
            res.status(200).json(healthService.getLiveness());
        },
        readiness(this: void, _req: Request, res: Response): void {
            void healthService
                .getReadiness()
                .then((result) => {
                    res.status(result.status === "ok" ? 200 : 503).json(result);
                })
                .catch(() => {
                    res.status(503).json({
                        status: "unhealthy",
                        uptime: Math.floor(process.uptime()),
                        timestamp: new Date().toISOString(),
                        version: "unknown",
                        checks: [],
                    });
                });
        },
    };
}
