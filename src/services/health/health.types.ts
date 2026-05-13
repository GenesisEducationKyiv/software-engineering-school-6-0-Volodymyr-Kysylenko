<<<<<<< HEAD
export type HealthStatus = "healthy" | "unhealthy";
=======
export type HealthStatus = "healthy" | "unhealthy" | "degraded";
>>>>>>> dc135d8 (refactor: Refactor health, metrics, scanner and subscription services to follow SOLID and GRASP principles)

export interface HealthCheck {
    name: string;
    status: HealthStatus;
    message?: string;
    responseTime?: number;
    details?: Record<string, unknown>;
}

export interface HealthCheckResult {
    status: HealthStatus;
    timestamp: string;
    uptime: number;
    version: string;
    checks: HealthCheck[];
}

export type HealthCheckFunction = () => Promise<HealthCheck>;

export interface HealthStatusCalculatorPort {
    calculateOverallStatus(checks: HealthCheck[]): HealthStatus;
}

export interface HealthEnvironmentPort {
    getNow(): Date;
    getUptime(): number;
    getVersion(): string;
}

<<<<<<< HEAD
=======
export interface HealthCheckRegistry {
    registerCheck(name: string, checkFn: HealthCheckFunction): void;
    getChecks(): Map<string, HealthCheckFunction>;
}

>>>>>>> dc135d8 (refactor: Refactor health, metrics, scanner and subscription services to follow SOLID and GRASP principles)
export interface HealthServicePort {
    getHealth(): Promise<HealthCheckResult>;
}

export interface HealthServiceDependencies {
    statusCalculator: HealthStatusCalculatorPort;
    environment: HealthEnvironmentPort;
    checks?: Map<string, HealthCheckFunction>;
}

<<<<<<< HEAD
=======
export interface DatabasePort {
    checkConnection(): Promise<void>;
}

export interface SubscriptionRepositoryPort {
    countActiveSubscriptions(): Promise<number>;
}

>>>>>>> dc135d8 (refactor: Refactor health, metrics, scanner and subscription services to follow SOLID and GRASP principles)
export interface DatabaseHealthCheckPort {
    checkConnection(): Promise<void>;
}

export interface SubscriptionsHealthCheckRepository {
    countActiveSubscriptions(): Promise<number>;
}
