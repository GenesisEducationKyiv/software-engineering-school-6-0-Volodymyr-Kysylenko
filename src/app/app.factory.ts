import { env } from "../config/env.js";
import { loadSwaggerDocument } from "../swagger/swagger.loader.js";
import { logger } from "../utils/logger/logger.js";
import { createApp } from "./app.js";

export function createProductionApp() {
    return createApp({
        config: {
            rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
            rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,
            bodyLimit: env.BODY_LIMIT,
        },
        logger,
        swaggerDocument: loadSwaggerDocument(env.APP_BASE_URL),
    });
}
