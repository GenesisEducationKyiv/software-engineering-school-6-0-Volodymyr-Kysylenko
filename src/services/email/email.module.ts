import { EmailService } from "./email.service.js";
import type { EmailClient, EmailMetrics, EmailTemplatePort } from "./email.types.js";

export interface EmailModule {
    emailService: EmailService;
}

export interface CreateEmailModuleDependencies {
    emailClient: EmailClient;
    templateBuilder: EmailTemplatePort;
    metrics: EmailMetrics;
}

export function createEmailModule(deps: CreateEmailModuleDependencies): EmailModule {
    return {
        emailService: new EmailService(deps.emailClient, deps.templateBuilder, deps.metrics),
    };
}
