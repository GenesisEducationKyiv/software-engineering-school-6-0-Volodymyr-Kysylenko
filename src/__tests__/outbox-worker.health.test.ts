import type { RabbitMqLifecyclePort } from "@github-release-notifier/broker-contracts";
import { describe, expect, it, vi } from "vitest";

import { createOutboxWorkerReadinessChecks } from "../outbox-worker/outbox-worker.health.js";
import type { DatabaseHealthCheckPort } from "../services/health/health.types.js";

function makeDatabaseHealthCheck(checkConnection: DatabaseHealthCheckPort["checkConnection"]): DatabaseHealthCheckPort {
    return { checkConnection };
}

function makeConnection(isConnected: boolean): RabbitMqLifecyclePort {
    return {
        connect: vi.fn(),
        disconnect: vi.fn(),
        isConnected: () => isConnected,
    };
}

describe("createOutboxWorkerReadinessChecks", () => {
    it("reports rabbitmq healthy when the connection is up", async () => {
        const checks = createOutboxWorkerReadinessChecks({
            databaseHealthCheck: makeDatabaseHealthCheck(async () => Promise.resolve()),
            connection: makeConnection(true),
        });

        const rabbitmqCheck = checks.get("rabbitmq");
        expect(rabbitmqCheck).toBeDefined();
        await expect(rabbitmqCheck?.()).resolves.toEqual({
            name: "rabbitmq",
            status: "healthy",
            message: "RabbitMQ connection established",
        });
    });

    it("reports rabbitmq unhealthy when the connection is down", async () => {
        const checks = createOutboxWorkerReadinessChecks({
            databaseHealthCheck: makeDatabaseHealthCheck(async () => Promise.resolve()),
            connection: makeConnection(false),
        });

        const rabbitmqCheck = checks.get("rabbitmq");
        await expect(rabbitmqCheck?.()).resolves.toEqual({
            name: "rabbitmq",
            status: "unhealthy",
            message: "RabbitMQ not connected",
        });
    });

    it("reports database healthy when checkConnection resolves", async () => {
        const checks = createOutboxWorkerReadinessChecks({
            databaseHealthCheck: makeDatabaseHealthCheck(async () => Promise.resolve()),
            connection: makeConnection(true),
        });

        const databaseCheck = checks.get("database");
        await expect(databaseCheck?.()).resolves.toEqual({
            name: "database",
            status: "healthy",
            message: "Database connection successful",
        });
    });

    it("reports database unhealthy when checkConnection rejects", async () => {
        const checks = createOutboxWorkerReadinessChecks({
            databaseHealthCheck: makeDatabaseHealthCheck(async () => Promise.reject(new Error("connection refused"))),
            connection: makeConnection(true),
        });

        const databaseCheck = checks.get("database");
        await expect(databaseCheck?.()).resolves.toEqual({
            name: "database",
            status: "unhealthy",
            message: "connection refused",
        });
    });
});
