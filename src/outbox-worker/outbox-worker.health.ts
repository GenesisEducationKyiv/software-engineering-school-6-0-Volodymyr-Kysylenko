import type { RabbitMqLifecyclePort } from "@github-release-notifier/broker-contracts";

import { createDatabaseHealthCheck } from "../services/health/health.checks.js";
import type { DatabaseHealthCheckPort, HealthCheckFunction } from "../services/health/health.types.js";

function createRabbitMqHealthCheck(connection: RabbitMqLifecyclePort): HealthCheckFunction {
    return async () =>
        Promise.resolve(
            connection.isConnected()
                ? { name: "rabbitmq", status: "healthy", message: "RabbitMQ connection established" }
                : { name: "rabbitmq", status: "unhealthy", message: "RabbitMQ not connected" },
        );
}

export function createOutboxWorkerReadinessChecks(deps: {
    databaseHealthCheck: DatabaseHealthCheckPort;
    connection: RabbitMqLifecyclePort;
}): Map<string, HealthCheckFunction> {
    return new Map<string, HealthCheckFunction>([
        ["database", createDatabaseHealthCheck(deps.databaseHealthCheck)],
        ["rabbitmq", createRabbitMqHealthCheck(deps.connection)],
    ]);
}
