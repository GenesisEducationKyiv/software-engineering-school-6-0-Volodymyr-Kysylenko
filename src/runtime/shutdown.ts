import type { Pool } from "pg";

import type { CacheServicePort } from "../services/cache/cache.types.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";
import type { ScannerRunner } from "./scanner-runner.js";

export interface ShutdownDependencies {
    logger: LoggerPort;
    cacheService: CacheServicePort;
    pool: Pool;
    scannerRunner: ScannerRunner;
}

export function registerGracefulShutdown(deps: ShutdownDependencies): void {
    const { logger, cacheService, pool, scannerRunner } = deps;

    async function shutdown(signal: "SIGINT" | "SIGTERM"): Promise<void> {
        logger.info(`Received ${signal}, shutting down gracefully...`);

        scannerRunner.stop();

        await cacheService.disconnect();
        await pool.end();

        process.exit(0);
    }

    process.on("SIGINT", () => {
        void shutdown("SIGINT");
    });

    process.on("SIGTERM", () => {
        void shutdown("SIGTERM");
    });
}
