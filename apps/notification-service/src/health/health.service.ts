import type { HealthServicePort, HealthStatus, SmtpHealthPort } from "./health.types.js";

export class HealthService implements HealthServicePort {
    private readonly startedAt = Date.now();

    constructor(
        private readonly version: string,
        private readonly smtp: SmtpHealthPort,
    ) {}

    async getHealth(): Promise<HealthStatus> {
        let smtpStatus: "ok" | "error";
        try {
            await this.smtp.verifyConnection();
            smtpStatus = "ok";
        } catch {
            smtpStatus = "error";
        }

        return {
            status: smtpStatus === "ok" ? "ok" : "degraded",
            uptime: Math.floor((Date.now() - this.startedAt) / 1000),
            timestamp: new Date().toISOString(),
            version: this.version,
            smtp: smtpStatus,
        };
    }
}
