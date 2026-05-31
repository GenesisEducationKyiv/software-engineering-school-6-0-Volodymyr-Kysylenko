import type { HealthCheck, HealthStatus, HealthStatusCalculatorPort } from "./health.types.js";

export class HealthStatusCalculator implements HealthStatusCalculatorPort {
    calculateOverallStatus(checks: HealthCheck[]): HealthStatus {
        if (checks.length === 0) {
            return "healthy";
        }

        const hasUnhealthy = checks.some((check) => check.status === "unhealthy");

        return hasUnhealthy ? "unhealthy" : "healthy";
    }
}
