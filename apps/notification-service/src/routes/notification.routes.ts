import { Router } from "express";

import { createNotificationController } from "../controllers/notification.controller.js";
import type { HealthServicePort } from "../health/health.types.js";

export interface NotificationRouterDeps {
    healthService: HealthServicePort;
}

export function createNotificationRouter(deps: NotificationRouterDeps): Router {
    const router = Router();
    const controller = createNotificationController(deps);

    router.get("/health/live", controller.liveness);
    router.get("/health/ready", controller.readiness);

    return router;
}
