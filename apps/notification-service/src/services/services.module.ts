import { env } from "../config/env.js";
import { createLogger } from "../utils/logger/logger.js";
import { LoggerEmailEventListener } from "./email/email.metrics.js";
import { createEmailModule } from "./email/email.module.js";
import type { EmailServicePort } from "./email/email.types.js";

export interface ServicesModule {
    emailService: EmailServicePort;
}

export function createServicesModule(): ServicesModule {
    const emailModule = createEmailModule({
        config: {
            smtp: {
                host: env.SMTP_HOST,
                port: env.SMTP_PORT,
                secure: env.SMTP_SECURE,
                user: env.SMTP_USER,
                pass: env.SMTP_PASS,
                timeoutMs: env.EMAIL_TIMEOUT_MS,
                from: env.SMTP_EMAIL_FROM,
            },
            retry: {
                attempts: env.EMAIL_RETRY_ATTEMPTS,
                baseDelayMs: env.EMAIL_RETRY_BASE_DELAY_MS,
                maxDelayMs: env.EMAIL_RETRY_MAX_DELAY_MS,
            },
        },
        logger: createLogger("EmailService"),
        listener: new LoggerEmailEventListener(createLogger("EmailEventListener")),
    });

    return {
        emailService: emailModule.emailService,
    };
}
