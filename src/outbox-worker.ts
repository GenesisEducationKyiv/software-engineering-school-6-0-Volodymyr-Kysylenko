import { assertNotificationTopology, RabbitMqConnection } from "@github-release-notifier/broker-contracts";
import type { ConfirmChannel } from "amqplib";

import { env } from "./config/env.js";
import { databaseHealthCheckAdapter } from "./db/adapters/database-health-check.adapter.js";
import { pool } from "./db/pool.js";
import { OutboxDispatcher } from "./outbox-worker/outbox-dispatcher.js";
import { createOutboxWorkerApp } from "./outbox-worker/outbox-worker.app.js";
import { createOutboxWorkerReadinessChecks } from "./outbox-worker/outbox-worker.health.js";
import { outboxRepository } from "./repositories/outbox.repository.js";
import { HealthService } from "./services/health/health.service.js";
import { HealthStatusCalculator } from "./services/health/health.status.js";
import { createLogger } from "./utils/logger/logger.js";

const logger = createLogger("OutboxWorker");

const connection = new RabbitMqConnection<ConfirmChannel>({
    config: { url: env.RABBITMQ_URL },
    logger,
    createChannel: async (conn) => conn.createConfirmChannel(),
    setupTopology: assertNotificationTopology,
});

const dispatcher = new OutboxDispatcher({
    outboxRepository,
    getChannel: () => (connection.isConnected() ? connection.getChannel() : null),
    logger,
    batchSize: env.OUTBOX_BATCH_SIZE,
    maxAttempts: env.OUTBOX_MAX_ATTEMPTS,
    staleProcessingMs: env.OUTBOX_STALE_PROCESSING_MS,
    publishConfirmTimeoutMs: env.RABBITMQ_PUBLISH_CONFIRM_TIMEOUT_MS,
});

const readinessService = new HealthService({
    statusCalculator: new HealthStatusCalculator(),
    environment: {
        getNow: () => new Date(),
        getUptime: () => process.uptime(),
        getVersion: () => process.env.npm_package_version ?? "1.0.0",
    },
    checks: createOutboxWorkerReadinessChecks({ databaseHealthCheck: databaseHealthCheckAdapter, connection }),
});

let pollTimer: NodeJS.Timeout | null = null;
let stopping = false;

async function pollLoop(): Promise<void> {
    if (stopping) {
        return;
    }

    try {
        const dispatched = await dispatcher.dispatchBatch();
        if (dispatched > 0) {
            logger.debug("Dispatched outbox messages", { count: dispatched });
        }
    } catch (error) {
        logger.error("Outbox dispatch iteration failed", error);
    } finally {
        // `stopping` may be flipped to true by shutdown() while the await above was pending;
        // TS narrows it to `false` here based on the early-return check, so disable the warning.
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!stopping) {
            pollTimer = setTimeout(() => void pollLoop(), env.OUTBOX_POLL_INTERVAL_MS);
        }
    }
}

async function bootstrap(): Promise<void> {
    try {
        await connection.connect();
        logger.info("RabbitMQ connected");
    } catch (error) {
        logger.warn("RabbitMQ connection failed, will retry in background", error);
    }

    const app = createOutboxWorkerApp({ readinessService });

    app.listen(env.OUTBOX_WORKER_PORT, () => {
        logger.info(`Outbox worker health server started on port ${env.OUTBOX_WORKER_PORT}`);
    });

    void pollLoop();
}

void bootstrap().catch(async (error: unknown) => {
    logger.error("Outbox worker bootstrap failed", error);
    await connection.disconnect();
    await pool.end();
    process.exit(1);
});

async function shutdown(signal: "SIGINT" | "SIGTERM"): Promise<void> {
    logger.info(`Received ${signal}, shutting down gracefully...`);

    stopping = true;
    if (pollTimer) {
        clearTimeout(pollTimer);
    }

    await connection.disconnect();
    await pool.end();

    process.exit(0);
}

process.on("SIGINT", () => {
    shutdown("SIGINT").catch((error: unknown) => {
        logger.error("Graceful shutdown failed", error);
        process.exit(1);
    });
});

process.on("SIGTERM", () => {
    shutdown("SIGTERM").catch((error: unknown) => {
        logger.error("Graceful shutdown failed", error);
        process.exit(1);
    });
});
