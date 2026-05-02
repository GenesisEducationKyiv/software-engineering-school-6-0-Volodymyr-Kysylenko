export interface HealthCheck {
    name: string;
    status: "healthy" | "unhealthy" | "degraded";
    message?: string;
    responseTime?: number;
    details?: Record<string, unknown>;
}

export interface HealthCheckResult {
    status: "healthy" | "unhealthy" | "degraded";
    timestamp: string;
    uptime: number;
    version: string;
    checks: HealthCheck[];
}

export class HealthService {
    private checks: Map<string, () => Promise<HealthCheck>> = new Map();
    private readonly version: string;

    constructor(version: string = process.env.npm_package_version || "1.0.0") {
        this.version = version;
    }

    registerCheck(name: string, checkFn: () => Promise<HealthCheck>): void {
        this.checks.set(name, checkFn);
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

        const overallStatus = this.calculateOverallStatus(checks);

        return {
            status: overallStatus,
            timestamp: new Date().toISOString(),
            uptime: process.uptime(),
            version: this.version,
            checks,
        };
    }

    private calculateOverallStatus(checks: HealthCheck[]): "healthy" | "unhealthy" | "degraded" {
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
