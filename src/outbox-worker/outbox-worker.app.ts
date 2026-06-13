import express, { type Express } from "express";
import helmet from "helmet";

import type { HealthServicePort } from "../services/health/health.types.js";

export interface OutboxWorkerAppDependencies {
    readinessService: HealthServicePort;
}

export function createOutboxWorkerApp(deps: OutboxWorkerAppDependencies): Express {
    const app = express();

    app.use(helmet());

    app.get("/health/live", (_req, res) => {
        res.status(200).json({ status: "ok" });
    });

    app.get("/health/ready", async (_req, res) => {
        const health = await deps.readinessService.getHealth();
        res.status(health.status === "unhealthy" ? 503 : 200).json(health);
    });

    return app;
}
