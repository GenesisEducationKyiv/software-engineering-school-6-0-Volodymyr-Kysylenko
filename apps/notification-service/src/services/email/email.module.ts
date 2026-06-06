import type { LoggerPort } from "../../utils/logger/logger.types.js";
import { SmtpEmailClient } from "./email.client.js";
import { AppEmailLinkBuilder } from "./email.links.js";
import { RetryingEmailClient } from "./email.retry.js";
import { EmailService } from "./email.service.js";
import { EmailTemplateBuilder } from "./email.templates.js";
import type { EmailMetrics, EmailServicePort } from "./email.types.js";

export interface EmailConfig {
    smtp: {
        host: string;
        port: number;
        secure: boolean;
        user?: string;
        pass?: string;
        timeoutMs: number;
        from: string;
    };
    retry: {
        attempts: number;
        baseDelayMs: number;
        maxDelayMs: number;
    };
}

export interface CreateEmailModuleDependencies {
    config: EmailConfig;
    logger: Pick<LoggerPort, "warn">;
    metrics: EmailMetrics;
}

export interface EmailModule {
    emailService: EmailServicePort;
}

export function createEmailModule(deps: CreateEmailModuleDependencies): EmailModule {
    const smtpClient = new SmtpEmailClient({
        host: deps.config.smtp.host,
        port: deps.config.smtp.port,
        secure: deps.config.smtp.secure,
        user: deps.config.smtp.user,
        pass: deps.config.smtp.pass,
        timeoutMs: deps.config.smtp.timeoutMs,
    });

    const emailClient = new RetryingEmailClient(smtpClient, deps.config.retry, deps.logger);
    const linkBuilder = new AppEmailLinkBuilder();
    const templateBuilder = new EmailTemplateBuilder({ from: deps.config.smtp.from }, linkBuilder);

    return {
        emailService: new EmailService(emailClient, templateBuilder, deps.metrics),
    };
}
