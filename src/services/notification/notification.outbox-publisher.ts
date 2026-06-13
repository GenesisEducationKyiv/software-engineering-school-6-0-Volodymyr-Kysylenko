import {
    createEnvelope,
    NOTIFICATION_CONTRACT_VERSION,
    NOTIFICATION_ROUTING_KEYS,
} from "@github-release-notifier/broker-contracts";
import type { PoolClient } from "pg";

import type { OutboxRepositoryPort } from "../../repositories/outbox.repository.js";
import type {
    EmailConfirmationInput,
    EmailNewReleaseInput,
    NotificationCommandPublisherPort,
} from "./notification.types.js";

/**
 * Records notification commands in the transactional outbox instead of
 * publishing to RabbitMQ directly, so they're persisted atomically with the
 * business state change and delivered later by the outbox worker.
 */
export class OutboxNotificationPublisher implements NotificationCommandPublisherPort {
    constructor(private readonly outboxRepository: OutboxRepositoryPort) {}

    async sendConfirmationEmail(client: PoolClient, input: EmailConfirmationInput): Promise<void> {
        const envelope = createEnvelope({
            type: "send-confirmation-email",
            version: NOTIFICATION_CONTRACT_VERSION,
            payload: {
                to: input.to,
                repo: input.repo,
                confirmToken: input.confirmToken,
                unsubscribeToken: input.unsubscribeToken,
            },
        });

        await this.outboxRepository.enqueue(client, NOTIFICATION_ROUTING_KEYS["send-confirmation-email"], envelope);
    }

    async sendNewReleaseEmail(client: PoolClient, input: EmailNewReleaseInput): Promise<void> {
        const envelope = createEnvelope({
            type: "send-new-release-email",
            version: NOTIFICATION_CONTRACT_VERSION,
            payload: {
                to: input.to,
                repo: input.repo,
                releaseName: input.releaseName,
                tagName: input.tagName,
                releaseUrl: input.releaseUrl,
                unsubscribeToken: input.unsubscribeToken,
            },
        });

        await this.outboxRepository.enqueue(client, NOTIFICATION_ROUTING_KEYS["send-new-release-email"], envelope);
    }
}
