import { createApp } from "../../app/app.js";
import { env } from "../../config/env.js";
import { loadSwaggerDocument } from "../../swagger/swagger.loader.js";
import { createSilentLogger } from "./silent-logger.js";

export function createTestApp() {
    return createApp({
        config: {
            rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
            rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,
            bodyLimit: env.BODY_LIMIT,
        },
        logger: createSilentLogger(),
        swaggerDocument: loadSwaggerDocument(env.APP_BASE_URL),
    });
}
