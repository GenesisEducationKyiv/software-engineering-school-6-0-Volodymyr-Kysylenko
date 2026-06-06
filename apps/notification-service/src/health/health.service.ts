import type { HealthServicePort, HealthStatus } from "./health.types.js";

export class HealthService implements HealthServicePort {
    private readonly startedAt = Date.now();

    constructor(private readonly version: string) {}

    getHealth(): HealthStatus {
        return {
            status: "ok",
            uptime: Math.floor((Date.now() - this.startedAt) / 1000),
            timestamp: new Date().toISOString(),
            version: this.version,
        };
    }
}
