export type HealthStatus = "ok" | "unhealthy";

export interface HealthCheck {
    name: string;
    status: HealthStatus;
    message?: string;
}

export interface HealthCheckResult {
    status: HealthStatus;
    uptime: number;
    timestamp: string;
    version: string;
    checks: HealthCheck[];
}

export type HealthCheckFunction = () => HealthCheck;

export interface HealthServicePort {
    getLiveness(): HealthCheckResult;
    getReadiness(): HealthCheckResult;
}
