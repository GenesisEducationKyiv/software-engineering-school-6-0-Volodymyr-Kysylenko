export type HealthStatus = "healthy" | "unhealthy";

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

export interface HealthServicePort {
    getHealth(): Promise<HealthCheckResult>;
}

export interface HealthServiceDependencies {
    statusCalculator: HealthStatusCalculatorPort;
    environment: HealthEnvironmentPort;
    checks?: Map<string, HealthCheckFunction>;
}

export interface DatabaseHealthCheckPort {
    checkConnection(): Promise<void>;
}

export interface SubscriptionsHealthCheckRepository {
    countActiveSubscriptions(): Promise<number>;
}
