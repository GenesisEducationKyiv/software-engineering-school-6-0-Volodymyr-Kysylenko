import type { HealthCheck, HealthStatus, HealthStatusCalculatorPort } from "./health.types.js";

export class HealthStatusCalculator implements HealthStatusCalculatorPort {
    calculateOverallStatus(checks: HealthCheck[]): HealthStatus {
        if (checks.length === 0) {
            return "healthy";
        }

        const hasUnhealthy = checks.some((check) => check.status === "unhealthy");
        const hasDegraded = checks.some((check) => check.status === "degraded");

        if (hasUnhealthy) {
            return "unhealthy";
        }

        if (hasDegraded) {
            return "degraded";
        }

        return "healthy";
    }
}
