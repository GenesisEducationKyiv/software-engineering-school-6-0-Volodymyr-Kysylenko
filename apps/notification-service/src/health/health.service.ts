import type { HealthCheckFunction, HealthCheckResult, HealthServicePort } from "./health.types.js";

export class HealthService implements HealthServicePort {
    private readonly startedAt = Date.now();

    constructor(
        private readonly version: string,
        private readonly readinessChecks: Map<string, HealthCheckFunction> = new Map(),
    ) {}

    getLiveness(): HealthCheckResult {
        return {
            status: "ok",
            uptime: this.getUptime(),
            timestamp: new Date().toISOString(),
            version: this.version,
            checks: [],
        };
    }

    getReadiness(): HealthCheckResult {
        const checks = [...this.readinessChecks.values()].map((check) => check());
        const status = checks.every((check) => check.status === "ok") ? "ok" : "unhealthy";

        return {
            status,
            uptime: this.getUptime(),
            timestamp: new Date().toISOString(),
            version: this.version,
            checks,
        };
    }

    private getUptime(): number {
        return Math.floor((Date.now() - this.startedAt) / 1000);
    }
}
