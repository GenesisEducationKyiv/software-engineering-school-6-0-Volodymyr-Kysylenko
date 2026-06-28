import type { EmailClientPort, EmailMessage, EmailRetryLoggerPort } from "./email.types.js";

export interface RetryConfig {
    attempts: number;
    baseDelayMs: number;
    maxDelayMs: number;
}

export class RetryingEmailClient implements EmailClientPort {
    private closed = false;
    private readonly pendingTimers = new Set<NodeJS.Timeout>();

    constructor(
        private readonly emailClient: EmailClientPort,
        private readonly config: RetryConfig,
        private readonly logger: EmailRetryLoggerPort,
    ) {}

    async verifyConnection(): Promise<void> {
        await this.emailClient.verifyConnection();
    }

    async close(): Promise<void> {
        this.closed = true;
        for (const timer of this.pendingTimers) {
            clearTimeout(timer);
        }
        this.pendingTimers.clear();
        await this.emailClient.close();
    }

    async send(message: EmailMessage): Promise<void> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= this.config.attempts; attempt++) {
            try {
                await this.emailClient.send(message);
                return;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));

                if (!this.shouldRetry(lastError)) {
                    this.logger.warn("Email send failed with permanent error, not retrying", lastError, {
                        attempt,
                        totalAttempts: this.config.attempts,
                        smtpCode: this.extractSmtpCode(lastError),
                    });
                    throw lastError;
                }

                const isLastAttempt = attempt === this.config.attempts;
                if (!isLastAttempt) {
                    const delayMs = this.getDelayMs(attempt);
                    this.logger.warn("Email send failed, retrying", lastError, {
                        attempt,
                        totalAttempts: this.config.attempts,
                        delayMs,
                        smtpCode: this.extractSmtpCode(lastError),
                    });
                    await this.delay(delayMs);
                    if (this.closed) {
                        throw lastError;
                    }
                } else {
                    this.logger.warn("Email send failed, all attempts exhausted", lastError, {
                        attempt,
                        totalAttempts: this.config.attempts,
                        smtpCode: this.extractSmtpCode(lastError),
                    });
                }
            }
        }

        throw lastError ?? new Error("Failed to send email");
    }

    private getDelayMs(attempt: number): number {
        return Math.min(this.config.baseDelayMs * Math.pow(2, attempt - 1), this.config.maxDelayMs);
    }

    private shouldRetry(error: Error): boolean {
        const smtpCode = this.extractSmtpCode(error);
        if (smtpCode === null) return true;
        return smtpCode < 500;
    }

    private extractSmtpCode(error: Error): number | null {
        const responseCode = (error as { responseCode?: number }).responseCode;
        return typeof responseCode === "number" ? responseCode : null;
    }

    private async delay(ms: number): Promise<void> {
        await new Promise<void>((resolve) => {
            const timer = setTimeout(() => {
                this.pendingTimers.delete(timer);
                resolve();
            }, ms);
            this.pendingTimers.add(timer);
        });
    }
}
