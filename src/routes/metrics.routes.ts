import { Router } from "express";

import { createMetricsController } from "../controllers/metrics/metrics.module.js";
import type { HealthServicePort } from "../services/health/health.types.js";
import type { MetricsGetMetricsPort } from "../services/metrics/metrics.types.js";
import { healthService, metricsService } from "../services/services.module.js";

export interface CreateMetricsRouterDependencies {
    healthService: HealthServicePort;
    metricsService: MetricsGetMetricsPort;
}

export function createMetricsRouter(deps: CreateMetricsRouterDependencies): Router {
    const metricsController = createMetricsController({
        healthService: deps.healthService,
        metricsService: deps.metricsService,
    });

    const router = Router();

    router.get("/metrics", metricsController.metricsCheck);
    router.get("/health", metricsController.healthCheck);

    return router;
}

export const metricsRouter = createMetricsRouter({
    healthService,
    metricsService,
});
