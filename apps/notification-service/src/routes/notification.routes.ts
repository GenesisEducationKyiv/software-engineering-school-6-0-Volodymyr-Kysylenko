import { Router } from "express";

import { createNotificationController } from "../controllers/notification.controller.js";
import type { HealthServicePort } from "../health/health.types.js";

export interface NotificationRouterDeps {
    healthService: HealthServicePort;
}

export function createNotificationRouter(deps: NotificationRouterDeps): Router {
    const router = Router();
    const controller = createNotificationController(deps);

    router.get("/health/live", (req, res) => {
        controller.liveness(req, res);
    });

    router.get("/health/ready", (req, res) => {
        controller.readiness(req, res);
    });

    return router;
}
