import { Router } from "express";

import { createMetricsController } from "../controllers/metrics.controller.js";
import { healthService, metricsService } from "../services/services.module.js";

const metricsController = createMetricsController({
    healthService,
    metricsService,
});

const { healthCheck, metricsCheck } = metricsController;

export const metricsRouter = Router();

metricsRouter.get("/metrics", metricsCheck);
metricsRouter.get("/health", healthCheck);
