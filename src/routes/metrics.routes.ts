import { Router } from "express";

import { createMetricsController } from "../controllers/metrics.controller.js";
import { healthService, metricsService } from "../services/services.module.js";

const metricsController = createMetricsController({
    healthService,
    metricsService,
});

const { healthCheck, liveCheck, metricsCheck, readyCheck } = metricsController;

export const metricsRouter = Router();

metricsRouter.get("/metrics", metricsCheck);
metricsRouter.get("/health", healthCheck);
metricsRouter.get("/health/live", liveCheck);
metricsRouter.get("/health/ready", readyCheck);
