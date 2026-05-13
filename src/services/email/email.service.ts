import nodemailer from "nodemailer";

import { env } from "../../config/env.js";
import { metricsService } from "../metrics/metrics.service.js";

const { SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, SMTP_EMAIL_FROM } = env;

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    connectionTimeout: env.EMAIL_TIMEOUT_MS,
    greetingTimeout: env.EMAIL_TIMEOUT_MS,
    socketTimeout: env.EMAIL_TIMEOUT_MS,
});

class EmailService {
    async verifyConnection(): Promise<void> {
        await transporter.verify();
    }

    private async sendWithRetry(mailOptions: object): Promise<void> {
        let lastError: Error | null = null;

        for (let attempt = 1; attempt <= env.EMAIL_RETRY_ATTEMPTS; attempt++) {
            try {
                await transporter.sendMail(mailOptions);
                return;
            } catch (error) {
                lastError = error instanceof Error ? error : new Error(String(error));
                if (attempt < env.EMAIL_RETRY_ATTEMPTS) {
                    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
            }
        }

        if (lastError) {
            throw lastError;
        }

        throw new Error("Failed to send email");
    }

    async sendConfirmationEmail(input: {
        to: string;
        repo: string;
        confirmToken: string;
        unsubscribeToken: string;
    }): Promise<void> {
        const confirmApiUrl = `${env.APP_BASE_URL}/api/confirm/${input.confirmToken}`;
        const unsubscribeApiUrl = `${env.APP_BASE_URL}/api/unsubscribe/${input.unsubscribeToken}`;

        const confirmPageUrl = `${env.APP_BASE_URL}/confirm/${input.confirmToken}`;
        const unsubscribePageUrl = `${env.APP_BASE_URL}/unsubscribe/${input.unsubscribeToken}`;

        try {
            await this.sendWithRetry({
                from: SMTP_EMAIL_FROM,
                to: input.to,
                subject: `Підтвердіть підписку на ${input.repo}`,
                text: [
                    `Підтвердіть підписку на нові релізи репозиторію ${input.repo}.`,
                    ``,
                    `Посилання для підтвердження:`,
                    `Браузер: ${confirmPageUrl}`,
                    `API: ${confirmApiUrl}`,
                    ``,
                    `Посилання для відписки:`,
                    `Браузер: ${unsubscribePageUrl}`,
                    `API: ${unsubscribeApiUrl}`,
                ].join("\n"),
            });
            metricsService.recordEmailSent("success");
        } catch (error) {
            metricsService.recordEmailSent("error");
            throw error;
        }
    }

    async sendNewReleaseEmail(input: {
        to: string;
        repo: string;
        releaseName: string | null;
        tagName: string;
        releaseUrl: string;
        unsubscribeToken: string;
    }): Promise<void> {
        const unsubscribePageUrl = `${env.APP_BASE_URL}/unsubscribe/${input.unsubscribeToken}`;
        const unsubscribeApiUrl = `${env.APP_BASE_URL}/api/unsubscribe/${input.unsubscribeToken}`;

        try {
            await this.sendWithRetry({
                from: SMTP_EMAIL_FROM,
                to: input.to,
                subject: `Новий реліз ${input.repo}: ${input.tagName}`,
                text: [
                    `Опубліковано новий реліз репозиторію ${input.repo}.`,
                    ``,
                    `Версія: ${input.tagName}`,
                    input.releaseName ? `Назва: ${input.releaseName}` : "",
                    `Деталі: ${input.releaseUrl}`,
                    ``,
                    `Відписатися:`,
                    `Браузер: ${unsubscribePageUrl}`,
                    `API: ${unsubscribeApiUrl}`,
                ]
                    .filter(Boolean)
                    .join("\n"),
            });
            metricsService.recordEmailSent("success");
        } catch (error) {
            metricsService.recordEmailSent("error");
            throw error;
        }
    }
}

export const emailService = new EmailService();
