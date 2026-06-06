export interface HealthStatus {
    status: "ok";
    uptime: number;
    timestamp: string;
    version: string;
}

export interface HealthServicePort {
    getHealth(): HealthStatus;
}
