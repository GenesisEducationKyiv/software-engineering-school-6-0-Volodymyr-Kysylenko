import type { Express } from "express";

import type { LoggerPort } from "../utils/logger/logger.types.js";
import type { ScannerRunner } from "./scanner-runner.js";

export interface BootstrapConfig {
    nodeEnv: string;
    port: number;
    grpcPort: number;
}

export interface BootstrapDependencies {
    config: BootstrapConfig;
    logger: LoggerPort;

    runMigrations: () => Promise<void>;
    connectCache: () => Promise<void>;
    verifyEmailConnection: () => Promise<void>;
    initializeMetrics: () => Promise<void>;

    createApp: () => Express;
    startGrpcServer: (port: number) => Promise<void>;
    scannerRunner: ScannerRunner;
}

export async function bootstrap(deps: BootstrapDependencies): Promise<void> {
    const { config, logger } = deps;

    logger.info(config.nodeEnv === "production" ? "Running in production mode" : "Running in development mode");

    await deps.runMigrations();

    try {
        await deps.connectCache();
        logger.info("Redis cache connected");
    } catch (error: unknown) {
        logger.warn("Redis connection failed, cache will be disabled", error);
    }

    try {
        await deps.verifyEmailConnection();
        logger.info("SMTP connection verified");
    } catch (error: unknown) {
        logger.warn("SMTP verification failed, continuing startup", error);
    }

    await deps.initializeMetrics();

    const app = deps.createApp();

    app.listen(config.port, () => {
        logger.info(`HTTP server started on port ${config.port}`);
    });

    await deps.startGrpcServer(config.grpcPort);

    deps.scannerRunner.start();
}
