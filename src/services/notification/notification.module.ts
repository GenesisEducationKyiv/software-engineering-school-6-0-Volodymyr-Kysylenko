import type { OutboxRepositoryPort } from "../../repositories/outbox.repository.js";
import { OutboxNotificationPublisher } from "./notification.outbox-publisher.js";
import type { NotificationCommandPublisherPort } from "./notification.types.js";

export interface NotificationModule {
    notificationPublisher: NotificationCommandPublisherPort;
}

export function createNotificationModule(outboxRepository: OutboxRepositoryPort): NotificationModule {
    return {
        notificationPublisher: new OutboxNotificationPublisher(outboxRepository),
    };
}
