export interface HealthStatus {
    status: "ok" | "degraded";
    uptime: number;
    timestamp: string;
    version: string;
    smtp: "ok" | "error";
}

export interface SmtpHealthPort {
    verifyConnection(): Promise<void>;
}

export interface HealthServicePort {
    getHealth(): Promise<HealthStatus>;
}
