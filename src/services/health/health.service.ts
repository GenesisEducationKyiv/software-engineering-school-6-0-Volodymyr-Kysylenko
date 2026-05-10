import type {
    HealthCheck,
    HealthCheckFunction,
    HealthCheckResult,
    HealthServiceDependencies,
    HealthServicePort,
} from "./health.types.js";

export class HealthService implements HealthServicePort {
    private readonly checks: Map<string, HealthCheckFunction>;

    constructor(private readonly deps: HealthServiceDependencies) {
        this.checks = deps.checks ?? new Map<string, HealthCheckFunction>();
    }

    async getHealth(): Promise<HealthCheckResult> {
        const checks: HealthCheck[] = [];

        for (const [name, checkFn] of this.checks) {
            try {
                const start = Date.now();

                const check = await checkFn();

                const responseTime = Date.now() - start;

                checks.push({
                    ...check,
                    name,
                    responseTime,
                });
            } catch (error) {
                checks.push({
                    name,
                    status: "unhealthy",
                    message: error instanceof Error ? error.message : "Unknown error",
                    responseTime: undefined,
                });
            }
        }

        const overallStatus = this.deps.statusCalculator.calculateOverallStatus(checks);

        return {
            status: overallStatus,
            timestamp: this.deps.environment.getNow().toISOString(),
            uptime: this.deps.environment.getUptime(),
            version: this.deps.environment.getVersion(),
            checks,
        };
    }
}
