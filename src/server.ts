// app
import { createApp } from "./app.js";
// environment
import { env } from "./config/env.js";
// database
import { runMigrations } from "./db/migrate.js";
import { pool } from "./db/pool.js";
// services
import { emailService } from "./services/email.service.js";
import { scannerService } from "./services/scanner.service.js";
import { metricsService } from "./services/metrics.service.js";
import { cacheService } from "./services/cache.service.js";

// gRPC server
import { startGrpcServer } from "./grpc/server.js";

const { NODE_ENV, PORT, GRPC_PORT, SCAN_INTERVAL_MS } = env;

async function bootstrap() {
    console.log(NODE_ENV === "production" ? "Running in production mode" : "Running in development mode");

    await runMigrations();

    // Redis cache connection verification
    try {
        await cacheService.connect();
        console.log("Redis cache connected");
    } catch (error) {
        console.warn("Redis connection failed, cache will be disabled", error);
    }

    // SMTP connection verification
    try {
        await emailService.verifyConnection();
        console.log("SMTP connection verified");
    } catch (error) {
        console.warn("SMTP verification failed, continuing startup", error);
    }

    // Initialize initial metrics
    await metricsService.initializeMetrics();

    // Start HTTP server
    const app = createApp();

    app.listen(PORT, () => {
        console.log(`HTTP server started on port ${PORT}`);
    });

    // Start gRPC server
    try {
        await startGrpcServer(GRPC_PORT);
    } catch (error) {
        console.error("Failed to start gRPC server", error);
        process.exit(1);
    }

    // Run scanner loop
    setInterval(() => {
        void scannerService
            .scanOnce()
            .then(() => {
                console.log("Scanner iteration completed");
            })
            .catch((error) => {
                console.error("Scanner iteration failed", error);
            });
    }, SCAN_INTERVAL_MS);

    // Run initial scan on startup
    void scannerService
        .scanOnce()
        .then(() => {
            console.log("Initial scanner run completed");
        })
        .catch((error) => {
            console.error("Initial scanner run failed", error);
        });
}

void bootstrap().catch(async (error) => {
    console.error("Application bootstrap failed", error);
    await cacheService.disconnect();
    await pool.end();
    process.exit(1);
});

// Graceful shutdown to ensure all resources are properly released
process.on("SIGINT", async () => {
    console.log("Received SIGINT, shutting down gracefully...");
    await cacheService.disconnect();
    await pool.end();
    process.exit(0);
});

process.on("SIGTERM", async () => {
    console.log("Received SIGTERM, shutting down gracefully...");
    await cacheService.disconnect();
    await pool.end();
    process.exit(0);
});
