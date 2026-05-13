import type { EmailClient, EmailMessage } from "./email.types.js";

export interface RetryConfig {
    attempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
}

export class RetryingEmailClient implements EmailClient {
    constructor(
        private readonly emailClient: EmailClient,
        private readonly config: RetryConfig,
    ) {}

    async verifyConnection(): Promise<void> {
        await this.emailClient.verifyConnection();
    }

    async send(message: EmailMessage): Promise<void> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.attempts; attempt++) {
            try {
                await this.emailClient.send(message);
                return;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (attempt < this.config.attempts) {
                    await this.delay(this.getDelayMs(attempt));
                }
            }
        }

        throw lastError ?? new Error("Failed to send email");
    }

    private getDelayMs(attempt: number): number {
        return Math.min(this.config.baseDelayMs * Math.pow(2, attempt - 1), this.config.maxDelayMs);
    }

    private async delay(ms: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, ms));
    }
}
