import type { HealthServicePort } from "../../services/health/health.types.js";
import type { MetricsGetMetricsPort } from "../../services/metrics/metrics.types.js";
import { MetricsController } from "./metrics.controller.js";

export interface CreateMetricsControllerDependencies {
    healthService: HealthServicePort;
    metricsService: MetricsGetMetricsPort;
}

export function createMetricsController(deps: CreateMetricsControllerDependencies): MetricsController {
    return new MetricsController({
        healthService: deps.healthService,
        metricsService: deps.metricsService,
    });
}
