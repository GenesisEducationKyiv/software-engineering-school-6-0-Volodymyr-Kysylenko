import { Router } from "express";

import { createNotificationController } from "../controllers/notification.controller.js";
import type { HealthServicePort } from "../health/health.types.js";
import type { EmailServicePort } from "../services/email/email.types.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";

export interface NotificationRouterDeps {
    emailService: EmailServicePort;
    healthService: HealthServicePort;
    logger: LoggerPort;
}

export function createNotificationRouter(deps: NotificationRouterDeps): Router {
    const router = Router();
    const controller = createNotificationController(deps);

    router.post("/notify/confirmation", (req, res, next) => {
        controller.sendConfirmation(req, res).catch(next);
    });

    router.post("/notify/release", (req, res, next) => {
        controller.sendRelease(req, res).catch(next);
    });

    router.get("/health", (req, res) => {
        controller.health(req, res);
    });

    return router;
}
