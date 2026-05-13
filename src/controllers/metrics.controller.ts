import type { NextFunction, Request, Response } from "express";

import type { HealthServicePort, HealthStatus } from "../services/health/health.types.js";
import type { MetricsGetMetricsPort } from "../services/metrics/metrics.types.js";
import { AppError } from "../utils/errors.js";

type ControllerMethod = (req: Request, res: Response, next: NextFunction) => Promise<void>;

interface MetricsControllerDependencies {
    healthService: HealthServicePort;
    metricsService: MetricsGetMetricsPort;
}

export class MetricsController {
    constructor(private readonly deps: MetricsControllerDependencies) {}

    healthCheck: ControllerMethod = async (_req, res, next) => {
        try {
            const healthData = await this.deps.healthService.getHealth();

            res.status(this.getHealthStatusCode(healthData.status)).json(healthData);
        } catch (error) {
            next(error);
        }
    };

    metricsCheck: ControllerMethod = async (_req, res, next) => {
        try {
            const metrics = await this.deps.metricsService.getMetrics();

            res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
            res.send(metrics);
        } catch {
            next(AppError.internal("Failed to collect metrics"));
        }
    };

    private getHealthStatusCode(status: HealthStatus): number {
        return status === "unhealthy" ? 503 : 200;
    }
}

export const createMetricsController = (deps: MetricsControllerDependencies): MetricsController => {
    return new MetricsController(deps);
};
