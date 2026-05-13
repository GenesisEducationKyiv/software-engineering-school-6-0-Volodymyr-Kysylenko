// node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// express
import express from "express";
import { rateLimit } from "express-rate-limit";
// security
import helmet from "helmet";
import type { JsonObject } from "swagger-ui-express";
import swaggerUi from "swagger-ui-express";
// documentation
import YAML from "yaml";

// config
import { env } from "./config/env.js";
import { createErrorHandler } from "./middleware/error-handler.js";
// middleware
import { validateOrigin } from "./middleware/origin.middleware.js";
import { createRequestLoggerMiddleware, requestIdMiddleware } from "./middleware/request.middleware.js";
import { metricsRouter } from "./routes/metrics.routes.js";
// routes
import { subscriptionPagesRouter, subscriptionRouter } from "./routes/subscription.routes.js";
// utils
import { AppError } from "./utils/errors.js";
import { logger } from "./utils/logger/logger.js";

type SwaggerDocument = JsonObject & {
    host?: string;
    schemes?: string[];
};

// for Swagger document
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const swaggerPath = path.resolve(__dirname, "../swagger.yaml");

// one-time load and parse of Swagger document at startup
const swaggerFileContent = fs.readFileSync(swaggerPath, "utf8");
const swaggerDocument = YAML.parse(swaggerFileContent) as SwaggerDocument;

// dynamically set host
const baseUrl = new URL(env.APP_BASE_URL);
swaggerDocument.host = baseUrl.host;
swaggerDocument.schemes = [baseUrl.protocol.slice(0, -1)];

// setup rate limiter
const limiter = rateLimit({
    windowMs: env.RATE_LIMIT_WINDOW_MS,
    max: env.RATE_LIMIT_MAX_REQUESTS,
    standardHeaders: true,
    legacyHeaders: false,
    message: "Too many requests from this IP, please try again later.",
});

export function createApp() {
    const app = express();

    // secured headers
    app.use(helmet());

    // origin validation for all routes
    app.use(validateOrigin);

    // request ID generation
    app.use(requestIdMiddleware);

    // request logging
    app.use(createRequestLoggerMiddleware(logger));

    // limit body size
    app.use(express.json({ limit: env.BODY_LIMIT }));

    // static
    app.use(express.static(path.resolve(process.cwd(), "public")));

    // home page
    app.get("/", (_req, res) => {
        res.sendFile(path.resolve(process.cwd(), "public", "index.html"));
    });

    // favicon handler
    app.get("/favicon.ico", (_req, res) => {
        res.status(204).end(); // No content
    });

    // robots.txt handler
    app.get("/robots.txt", (_req, res) => {
        res.type("text/plain");
        res.send("User-agent: *\nDisallow: /api/\nAllow: /\n");
    });

    // sitemap.xml handler
    app.get("/sitemap.xml", (_req, res) => {
        res.status(404).end();
    });

    // Swagger docs
    app.use("/swagger", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

    app.use("/api", limiter);

    app.use("/api", subscriptionRouter);
    app.use("/api", metricsRouter);

    // HTML pages
    app.use(subscriptionPagesRouter);

    // unmatched routes
    app.use("*", (req, res, next) => {
        logger.warn("Route not found", {
            method: req.method,
            path: req.path,
            originalUrl: req.originalUrl,
            userAgent: req.get("User-Agent"),
        });
        const error = AppError.notFound("Route not found");
        next(error);
    });

    // error middleware
    app.use(createErrorHandler(logger));

    return app;
}
