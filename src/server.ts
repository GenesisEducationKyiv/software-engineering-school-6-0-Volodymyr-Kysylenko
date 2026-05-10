import { createApp } from "./app/app.js";
import { env } from "./config/env.js";
import { runMigrations } from "./db/migrate.js";
import { pool } from "./db/pool.js";
import { startGrpcServer } from "./grpc/server.js";
import { bootstrap } from "./runtime/bootstrap.js";
import { createScannerRunner } from "./runtime/scanner-runner.js";
import { registerGracefulShutdown } from "./runtime/shutdown.js";
import {
    cacheService,
    emailService,
    metricsService,
    scannerService,
    subscriptionService,
} from "./services/services.module.js";
import { loadSwaggerDocument } from "./swagger/swagger.loader.js";
import { logger } from "./utils/logger/logger.js";

const scannerRunner = createScannerRunner({
    scanner: scannerService,
    logger,
    intervalMs: env.SCAN_INTERVAL_MS,
});

registerGracefulShutdown({
    logger,
    cacheService,
    pool,
    scannerRunner,
});

void bootstrap({
    config: {
        nodeEnv: env.NODE_ENV,
        port: env.PORT,
        grpcPort: env.GRPC_PORT,
    },

    logger,

    runMigrations,

    connectCache: async () => cacheService.connect(),
    verifyEmailConnection: async () => emailService.verifyConnection(),
    initializeMetrics: async () => metricsService.initializeMetrics(),

    createApp: () =>
        createApp({
            config: {
                rateLimitWindowMs: env.RATE_LIMIT_WINDOW_MS,
                rateLimitMaxRequests: env.RATE_LIMIT_MAX_REQUESTS,
                bodyLimit: env.BODY_LIMIT,
            },
            logger,
            swaggerDocument: loadSwaggerDocument(env.APP_BASE_URL),
        }),

    startGrpcServer: async (port) => startGrpcServer(port, { subscriptionService }),
    scannerRunner,
}).catch(async (error: unknown) => {
    logger.error("Application bootstrap failed", error);

    scannerRunner.stop();
    await cacheService.disconnect();
    await pool.end();

    process.exit(1);
});
