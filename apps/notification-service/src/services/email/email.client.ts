import nodemailer from "nodemailer";

import type { EmailClientPort, EmailMessage } from "./email.types.js";

export interface SmtpEmailClientConfig {
    host: string;
    port: number;
    secure: boolean;
    user?: string;
    pass?: string;
    timeoutMs: number;
}

export class SmtpEmailClient implements EmailClientPort {
    private readonly transporter: nodemailer.Transporter;

    constructor(config: SmtpEmailClientConfig) {
        this.transporter = nodemailer.createTransport({
            host: config.host,
            port: config.port,
            secure: config.secure,
            auth: config.user ? { user: config.user, pass: config.pass } : undefined,
            connectionTimeout: config.timeoutMs,
            greetingTimeout: config.timeoutMs,
            socketTimeout: config.timeoutMs,
        });
    }

    async verifyConnection(): Promise<void> {
        await this.transporter.verify();
    }

    async send(message: EmailMessage): Promise<void> {
        await this.transporter.sendMail(message);
    }

    async close(): Promise<void> {
        this.transporter.close();
        return Promise.resolve();
    }
}
