import express from "express";
import helmet from "helmet";

import type { HealthServicePort } from "./health/health.types.js";
import { createErrorHandlerMiddleware } from "./middleware/error-handler.middleware.js";
import { requestIdMiddleware } from "./middleware/request-id.middleware.js";
import { createRequestLoggerMiddleware } from "./middleware/request-logger.middleware.js";
import { createNotificationRouter } from "./routes/notification.routes.js";
import type { LoggerPort } from "./utils/logger/logger.types.js";

export interface AppDependencies {
    healthService: HealthServicePort;
    logger: LoggerPort;
}

export function createApp(deps: AppDependencies): express.Application {
    const app = express();

    app.use(helmet());
    app.use(requestIdMiddleware);
    app.use(createRequestLoggerMiddleware(deps.logger));
    app.use(express.json({ limit: "100kb" }));

    app.use("/api", createNotificationRouter(deps));

    app.use(createErrorHandlerMiddleware(deps.logger));

    return app;
}
