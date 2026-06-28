import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { HealthService } from "./health/health.service.js";
import type { HealthCheckFunction } from "./health/health.types.js";
import { RedisIdempotencyStore } from "./idempotency/redis-idempotency.store.js";
import { createMessagingModule } from "./messaging/messaging.module.js";
import { createServicesModule } from "./services/services.module.js";
import { createLogger, logger } from "./utils/logger/logger.js";

process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection", reason);
    process.exit(1);
});

async function bootstrap(): Promise<void> {
    logger.info("Notification service starting", { env: env.NODE_ENV });

    const services = createServicesModule();
    const version = process.env.APP_VERSION ?? process.env.npm_package_version ?? "1.0.0";
    try {
        await services.emailService.verifyConnection();
        logger.info("SMTP connection verified");
    } catch (error) {
        logger.warn("SMTP verification failed, continuing startup", error);
    }

    const idempotencyStore = new RedisIdempotencyStore(
        { redisUrl: env.REDIS_URL, ttlSeconds: env.IDEMPOTENCY_TTL_SECONDS },
        createLogger("IdempotencyStore"),
    );

    try {
        await idempotencyStore.connect();
        logger.info("Redis idempotency store connected");
    } catch (error) {
        logger.warn("Redis connection failed, will retry in background", error);
    }

    const messaging = createMessagingModule({
        config: {
            rabbitmq: { url: env.RABBITMQ_URL },
            prefetch: env.RABBITMQ_PREFETCH,
            appBaseUrl: env.APP_BASE_URL,
            publishConfirmTimeoutMs: env.RABBITMQ_PUBLISH_CONFIRM_TIMEOUT_MS,
        },
        emailService: services.emailService,
        idempotencyStore,
        logger: createLogger("NotificationConsumer"),
    });

    try {
        await messaging.start();
        logger.info("RabbitMQ consumer started");
    } catch (error) {
        logger.warn("RabbitMQ connection failed, will retry in background", error);
    }

    const smtpCheck: HealthCheckFunction = async () => {
        try {
            await services.emailService.verifyConnection();
            return { name: "smtp", status: "ok" } as const;
        } catch {
            return { name: "smtp", status: "unhealthy" } as const;
        }
    };
    const rabbitmqCheck: HealthCheckFunction = async () =>
        Promise.resolve({ name: "rabbitmq", status: messaging.connection.isConnected() ? "ok" : "unhealthy" } as const);
    const redisCheck: HealthCheckFunction = async () =>
        Promise.resolve({ name: "redis", status: idempotencyStore.isConnected() ? "ok" : "unhealthy" } as const);

    const healthService = new HealthService(
        version,
        new Map([
            ["smtp", smtpCheck],
            ["rabbitmq", rabbitmqCheck],
            ["redis", redisCheck],
        ]),
    );

    const app = createApp({
        healthService,
        logger: createLogger("Http"),
    });

    const server = app.listen(env.PORT, () => {
        logger.info(`Notification service listening on port ${env.PORT}`);
    });

    const shutdown = (signal: string): void => {
        logger.info(`Received ${signal}, shutting down gracefully`);
        server.close(() => {
            void Promise.all([
                services.emailService.close(),
                messaging.connection.disconnect(),
                idempotencyStore.disconnect(),
            ]).finally(() => {
                logger.info("HTTP server closed");
                process.exit(0);
            });
        });
        setTimeout(() => {
            logger.error("Forced shutdown after timeout");
            process.exit(1);
        }, env.SHUTDOWN_TIMEOUT_MS).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}

void bootstrap().catch((error: unknown) => {
    logger.error("Notification service bootstrap failed", error);
    process.exit(1);
});
