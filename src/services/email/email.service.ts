import type {
    EmailClient,
    EmailConfirmationInput,
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
        await this.sendTracked(message);
    }

    async sendNewReleaseEmail(input: EmailNewReleaseInput): Promise<void> {
        const message = this.templateBuilder.buildNewReleaseEmail(input);
        await this.sendTracked(message);
    }

    private async sendTracked(message: Parameters<EmailClient["send"]>[0]): Promise<void> {
        try {
            await this.emailClient.send(message);
            this.metrics.recordEmailSent("success");
        } catch (error) {
            this.metrics.recordEmailSent("error");
            throw error;
        }
    }
}
