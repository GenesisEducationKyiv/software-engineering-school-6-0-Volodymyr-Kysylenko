// app
import { createApp } from "./app.js";
// environment
import { env } from "./config/env.js";
// database
import { runMigrations } from "./db/migrate.js";
import { pool } from "./db/pool.js";
// gRPC server
import { startGrpcServer } from "./grpc/server.js";
// saga
import { createSagaModule } from "./sagas/saga.module.js";
// services
import { cacheLifecycle, confirmationSaga, metricsService, scannerService } from "./services/services.module.js";
// logger
import { logger } from "./utils/logger/logger.js";

const { NODE_ENV, PORT, GRPC_PORT, SCAN_INTERVAL_MS } = env;

const sagaModule = createSagaModule({
    config: { url: env.RABBITMQ_URL },
    saga: confirmationSaga,
    logger,
});

async function bootstrap() {
    logger.info(NODE_ENV === "production" ? "Running in production mode" : "Running in development mode");

    await runMigrations();

    // Redis cache connection verification
    try {
        await cacheLifecycle.connect();
        logger.info("Redis cache connected");
    } catch (error) {
        logger.warn("Redis connection failed, cache will be disabled", error);
    }

    // Initialize initial metrics
    await metricsService.initializeMetrics();

    // Start HTTP server
    const app = createApp();

    app.listen(PORT, () => {
        logger.info(`HTTP server started on port ${PORT}`);
    });

    // Start gRPC server
    try {
        await startGrpcServer(GRPC_PORT);
    } catch (error) {
        logger.error("Failed to start gRPC server", error);
        process.exit(1);
    }

    // Run scanner loop
    setInterval(() => {
        void scannerService
            .scanOnce()
            .then(() => {
                logger.info("Scanner iteration completed");
            })
            .catch((error: unknown) => {
                logger.error("Scanner iteration failed", error);
            });
    }, SCAN_INTERVAL_MS);

    // Run initial scan on startup
    void scannerService
        .scanOnce()
        .then(() => {
            logger.info("Initial scanner run completed");
        })
        .catch((error: unknown) => {
            logger.error("Initial scanner run failed", error);
        });

    // Start saga reply consumer
    try {
        await sagaModule.start();
        logger.info("Saga reply consumer started");
    } catch (error) {
        logger.warn("Saga reply consumer connection failed, will retry in background", error);
    }
}

void bootstrap().catch(async (error: unknown) => {
    logger.error("Application bootstrap failed", error);
    await Promise.all([cacheLifecycle.disconnect(), sagaModule.stop()]);
    await pool.end();
    process.exit(1);
});

async function shutdown(signal: "SIGINT" | "SIGTERM"): Promise<void> {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    await Promise.all([cacheLifecycle.disconnect(), sagaModule.stop()]);
    await pool.end();

    process.exit(0);
}

// Graceful shutdown to ensure all resources are properly released
process.on("SIGINT", () => {
    void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
    void shutdown("SIGTERM");
});
