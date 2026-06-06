import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { HealthService } from "./health/health.service.js";
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
    const healthService = new HealthService(version);

    try {
        await services.emailService.verifyConnection();
        logger.info("SMTP connection verified");
    } catch (error) {
        logger.warn("SMTP verification failed, continuing startup", error);
    }

    const app = createApp({
        emailService: services.emailService,
        healthService,
        logger: createLogger("Http"),
    });

    const server = app.listen(env.PORT, () => {
        logger.info(`Notification service listening on port ${env.PORT}`);
    });

    const shutdown = (signal: string): void => {
        logger.info(`Received ${signal}, shutting down gracefully`);
        server.close(() => {
            logger.info("HTTP server closed");
            process.exit(0);
        });
        setTimeout(() => {
            logger.error("Forced shutdown after timeout");
            process.exit(1);
        }, 10_000).unref();
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
}

void bootstrap().catch((error: unknown) => {
    logger.error("Notification service bootstrap failed", error);
    process.exit(1);
});
