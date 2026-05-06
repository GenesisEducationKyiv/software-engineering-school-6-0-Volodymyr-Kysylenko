import type { NextFunction, Request, Response } from "express";

import { pool } from "../db/pool.js";
import { subscriptionRepository } from "../repositories/subscription.repository.js";
import { HealthService } from "../services/health.service.js";
import { metricsService } from "../services/metrics.service.js";
import { AppError } from "../utils/errors.js";

type ControllerMethod = (req: Request, res: Response, next: NextFunction) => Promise<void>;

class MetricsController {
    private readonly healthService = new HealthService();

    constructor() {
        this.setupHealthChecks();
    }

    private setupHealthChecks(): void {
        this.healthService.registerCheck("database", async () => {
            try {
                await pool.query("SELECT 1");
                return {
                    name: "database",
                    status: "healthy" as const,
                    message: "Database connection successful",
                };
            } catch (error) {
                return {
                    name: "database",
                    status: "unhealthy" as const,
                    message: error instanceof Error ? error.message : "Database connection failed",
                };
            }
        });

        this.healthService.registerCheck("subscriptions", async () => {
            try {
                const count = await subscriptionRepository.countActiveSubscriptions();
                return {
                    name: "subscriptions",
                    status: "healthy" as const,
                    message: `Active subscriptions: ${count}`,
                    details: { count },
                };
            } catch {
                return {
                    name: "subscriptions",
                    status: "degraded" as const,
                    message: "Could not retrieve subscription count",
                };
            }
        });
    }

    healthCheck: ControllerMethod = async (_req, res) => {
        try {
            const healthData = await this.healthService.getHealth();
            const status = healthData.status === "healthy" ? 200 : healthData.status === "degraded" ? 200 : 503;

            res.status(status).json(healthData);
        } catch {
            res.status(503).json({
                status: "unhealthy",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
                version: process.env.npm_package_version ?? "1.0.0",
                checks: [],
                message: "Health check failed",
            });
        }
    };

    metricsCheck: ControllerMethod = async (_req, res) => {
        try {
            const metrics = await metricsService.getMetrics();
            res.set("Content-Type", "text/plain; version=0.0.4; charset=utf-8");
            res.send(metrics);
        } catch {
            throw AppError.internal("Failed to collect metrics");
        }
    };
}

export const metricsController = new MetricsController();
