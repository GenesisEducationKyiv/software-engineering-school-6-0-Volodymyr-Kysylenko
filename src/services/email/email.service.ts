import { elapsedSeconds } from "../../utils/hrtime.js";
import type {
    EmailClient,
    EmailConfirmationInput,
    EmailMessage,
    EmailMetrics,
    EmailNewReleaseInput,
    EmailServicePort,
    EmailTemplatePort,
} from "./email.types.js";

export class EmailService implements EmailServicePort {
    constructor(
        private readonly emailClient: EmailClient,
        private readonly templateBuilder: EmailTemplatePort,
        private readonly metrics: EmailMetrics,
    ) {}

    async verifyConnection(): Promise<void> {
        await this.emailClient.verifyConnection();
    }

    async sendConfirmationEmail(input: EmailConfirmationInput): Promise<void> {
        const message = this.templateBuilder.buildConfirmationEmail(input);
        await this.sendTracked(message, "confirmation");
    }

    async sendNewReleaseEmail(input: EmailNewReleaseInput): Promise<void> {
        const message = this.templateBuilder.buildNewReleaseEmail(input);
        await this.sendTracked(message, "release");
    }

    private async sendTracked(message: EmailMessage, type: "confirmation" | "release"): Promise<void> {
        const t0 = process.hrtime.bigint();
        try {
            await this.emailClient.send(message);
            this.metrics.recordEmailSent("success");
        } catch (error) {
            this.metrics.recordEmailSent("error");
            throw error;
        } finally {
            this.metrics.recordEmailDuration(type, elapsedSeconds(t0));
        }
    }
}
