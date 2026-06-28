import { elapsedSeconds } from "../../utils/hrtime.js";
import type {
    EmailClientPort,
    EmailConfirmationInput,
    EmailEventListenerPort,
    EmailMessage,
    EmailNewReleaseInput,
    EmailServicePort,
    EmailTemplatePort,
} from "./email.types.js";

export class EmailService implements EmailServicePort {
    constructor(
        private readonly emailClient: EmailClientPort,
        private readonly templateBuilder: EmailTemplatePort,
        private readonly listener: EmailEventListenerPort,
    ) {}

    async verifyConnection(): Promise<void> {
        await this.emailClient.verifyConnection();
    }

    async close(): Promise<void> {
        await this.emailClient.close();
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
            this.listener.recordEmailSent("success");
        } catch (error) {
            this.listener.recordEmailSent("error");
            throw error;
        } finally {
            this.listener.recordEmailDuration(type, elapsedSeconds(t0));
        }
    }
}
