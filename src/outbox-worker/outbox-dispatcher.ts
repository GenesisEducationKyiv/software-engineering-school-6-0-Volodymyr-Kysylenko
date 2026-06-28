import { type LoggerPort, NOTIFICATION_EXCHANGE, publishWithConfirm } from "@github-release-notifier/broker-contracts";
import type { ConfirmChannel } from "amqplib";

import type { OutboxRecord, OutboxRepositoryPort } from "../repositories/outbox.repository.js";

export interface OutboxDispatcherDependencies {
    outboxRepository: OutboxRepositoryPort;
    /** Returns the confirm channel, or `null` if RabbitMQ isn't connected right now. */
    getChannel: () => ConfirmChannel | null;
    logger: LoggerPort;
    batchSize: number;
    maxAttempts: number;
    staleProcessingMs: number;
    publishConfirmTimeoutMs: number;
}

/**
 * Polls the notification_outbox table and publishes pending/failed rows to
 * the notification commands exchange, using publisher confirms so a row is
 * only marked published once RabbitMQ has durably accepted it.
 */
export class OutboxDispatcher {
    constructor(private readonly deps: OutboxDispatcherDependencies) {}

    async dispatchBatch(): Promise<number> {
        const channel = this.deps.getChannel();
        if (!channel) {
            return 0;
        }

        const batch = await this.deps.outboxRepository.claimBatch(
            this.deps.batchSize,
            this.deps.maxAttempts,
            this.deps.staleProcessingMs,
        );

        for (const row of batch) {
            await this.dispatchOne(channel, row);
        }

        return batch.length;
    }

    private async dispatchOne(channel: ConfirmChannel, row: OutboxRecord): Promise<void> {
        try {
            const content = Buffer.from(JSON.stringify(row.payload));

            await publishWithConfirm(
                channel,
                NOTIFICATION_EXCHANGE,
                row.routingKey,
                content,
                { persistent: true, contentType: "application/json", messageId: row.messageId },
                this.deps.publishConfirmTimeoutMs,
            );

            await this.deps.outboxRepository.markPublished(row.id);
        } catch (error) {
            this.deps.logger.error("Failed to publish outbox message", error, {
                outboxId: row.id,
                messageId: row.messageId,
                routingKey: row.routingKey,
            });
            await this.deps.outboxRepository.markFailed(row.id, error instanceof Error ? error.message : String(error));
        }
    }
}
