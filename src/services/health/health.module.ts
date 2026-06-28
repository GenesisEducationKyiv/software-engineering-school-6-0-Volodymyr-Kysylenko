import { createDatabaseHealthCheck, createSubscriptionsHealthCheck } from "./health.checks.js";
import { HealthService } from "./health.service.js";
import { HealthStatusCalculator } from "./health.status.js";
import type {
    DatabaseHealthCheckPort,
    HealthCheckFunction,
    HealthEnvironmentPort,
    HealthServiceDependencies,
    HealthServicePort,
    HealthStatusCalculatorPort,
    SubscriptionsHealthCheckRepository,
} from "./health.types.js";

export interface CreateHealthModuleDependencies {
    databaseHealthCheck: DatabaseHealthCheckPort;
    subscriptionRepository: SubscriptionsHealthCheckRepository;
    statusCalculator?: HealthStatusCalculatorPort;
    environment: HealthEnvironmentPort;
}

export interface HealthModule {
    healthService: HealthServicePort;
}

export function createHealthModule(deps: CreateHealthModuleDependencies): HealthModule {
    const checks = new Map<string, HealthCheckFunction>([
        ["database", createDatabaseHealthCheck(deps.databaseHealthCheck)],
        ["subscriptions", createSubscriptionsHealthCheck(deps.subscriptionRepository)],
    ]);

    const serviceDependencies: HealthServiceDependencies = {
        statusCalculator: deps.statusCalculator ?? new HealthStatusCalculator(),
        environment: deps.environment,
        checks,
    };

    return {
        healthService: new HealthService(serviceDependencies),
    };
}
