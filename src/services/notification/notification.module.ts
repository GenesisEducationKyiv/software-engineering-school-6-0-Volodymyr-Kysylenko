import { type NotificationClientConfig, NotificationHttpClient } from "./notification.client.js";
import type { EmailServicePort } from "./notification.types.js";

export interface NotificationModule {
    emailService: EmailServicePort;
}

export function createNotificationModule(config: NotificationClientConfig): NotificationModule {
    return {
        emailService: new NotificationHttpClient(config),
    };
}
