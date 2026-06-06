import type { EmailConfirmationInput, EmailNewReleaseInput, EmailServicePort } from "./notification.types.js";

export interface NotificationClientConfig {
    serviceUrl: string;
    timeoutMs: number;
    appBaseUrl: string;
}

export class NotificationHttpClient implements EmailServicePort {
    constructor(private readonly config: NotificationClientConfig) {}

    async verifyConnection(): Promise<void> {
        const response = await this.request("GET", "/api/health");
        if (!response.ok) {
            throw new Error(`Notification service health check failed with status ${response.status}`);
        }
    }

    async sendConfirmationEmail(input: EmailConfirmationInput): Promise<void> {
        await this.post("/api/notify/confirmation", { ...input, appBaseUrl: this.config.appBaseUrl });
    }

    async sendNewReleaseEmail(input: EmailNewReleaseInput): Promise<void> {
        await this.post("/api/notify/release", { ...input, appBaseUrl: this.config.appBaseUrl });
    }

    private async post(path: string, body: unknown): Promise<void> {
        const response = await this.request("POST", path, body);
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`Notification service error ${response.status}: ${text}`);
        }
    }

    private async request(method: string, path: string, body?: unknown): Promise<Response> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), this.config.timeoutMs);
        try {
            return await fetch(`${this.config.serviceUrl}${path}`, {
                method,
                headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
                body: body !== undefined ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
        } finally {
            clearTimeout(timer);
        }
    }
}
