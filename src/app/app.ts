import path from "node:path";

import express, { type Express } from "express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import swaggerUi from "swagger-ui-express";

import { createErrorHandler } from "../middleware/error-handler.js";
import { validateOrigin } from "../middleware/origin.middleware.js";
import { createRequestLoggerMiddleware, requestIdMiddleware } from "../middleware/request.middleware.js";
import { metricsRouter } from "../routes/metrics.routes.js";
import { subscriptionPagesRouter, subscriptionRouter } from "../routes/subscription.routes.js";
import type { SwaggerDocument } from "../swagger/swagger.types.js";
import { AppError } from "../utils/errors.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";

export interface AppConfig {
    rateLimitWindowMs: number;
    rateLimitMaxRequests: number;
    bodyLimit: string;
}

export interface CreateAppDependencies {
    config: AppConfig;
    logger: LoggerPort;
    swaggerDocument: SwaggerDocument;
}

export function createApp(deps: CreateAppDependencies): Express {
    const { config, logger, swaggerDocument } = deps;

    const app = express();

    const limiter = rateLimit({
        windowMs: config.rateLimitWindowMs,
        max: config.rateLimitMaxRequests,
        standardHeaders: true,
        legacyHeaders: false,
        message: "Too many requests from this IP, please try again later.",
    });

    app.use(helmet());
    app.use(validateOrigin);
    app.use(requestIdMiddleware);
    app.use(createRequestLoggerMiddleware(logger));
    app.use(express.json({ limit: config.bodyLimit }));
    app.use(express.static(path.resolve(process.cwd(), "public")));

    app.get("/", (_req, res) => {
        res.sendFile(path.resolve(process.cwd(), "public", "index.html"));
    });

    app.get("/favicon.ico", (_req, res) => {
        res.status(204).end();
    });

    app.get("/robots.txt", (_req, res) => {
        res.type("text/plain").send("User-agent: *\nDisallow: /api/\nAllow: /\n");
    });

    app.get("/sitemap.xml", (_req, res) => {
        res.status(404).end();
    });

    app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    app.use("/api", limiter);
    app.use("/api", subscriptionRouter);
    app.use("/api", metricsRouter);

    app.use(subscriptionPagesRouter);

    app.use("*", (req, _res, next) => {
        logger.warn("Route not found", {
            method: req.method,
            path: req.path,
            originalUrl: req.originalUrl,
            userAgent: req.get("User-Agent"),
        });

        next(AppError.notFound("Route not found"));
    });

    app.use(createErrorHandler(logger));

    return app;
}
