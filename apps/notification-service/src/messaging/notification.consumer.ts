import {
    getRetryTier,
    MAX_DELIVERY_ATTEMPTS,
    NOTIFICATION_EMAIL_DLX,
    NOTIFICATION_EMAIL_QUEUE,
    NOTIFICATION_RETRY_EXCHANGE,
    type NotificationEmailEnvelope,
    NotificationEmailEnvelopeSchema,
    publishWithConfirm,
    RETRY_COUNT_HEADER,
} from "@github-release-notifier/broker-contracts";
import type { ConfirmChannel, ConsumeMessage, Options } from "amqplib";

import type { IdempotencyStorePort } from "../idempotency/idempotency.types.js";
import type { EmailServicePort } from "../services/email/email.types.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";

export type NotificationConsumerChannel = Pick<ConfirmChannel, "consume" | "ack" | "nack" | "publish">;

export interface NotificationConsumerDeps {
    channel: NotificationConsumerChannel;
    emailService: EmailServicePort;
    idempotencyStore: IdempotencyStorePort;
    logger: LoggerPort;
    appBaseUrl: string;
    publishConfirmTimeoutMs: number;
}
export class NotificationConsumer {
    constructor(private readonly deps: NotificationConsumerDeps) {}

    async start(): Promise<void> {
        await this.deps.channel.consume(
            NOTIFICATION_EMAIL_QUEUE,
            (message) => {
                void this.handleMessage(message);
            },
            { noAck: false },
        );
    }

    async handleMessage(message: ConsumeMessage | null): Promise<void> {
        if (!message) {
            return;
        }

        const envelope = this.parseEnvelope(message);
        if (!envelope) {
            await this.publishToFinalDlq(message);
            return;
        }

        try {
            await this.dispatch(envelope);
        } catch (error) {
            this.deps.logger.error("Failed to process notification command", error, {
                messageId: envelope.messageId,
                type: envelope.type,
            });
            await this.requeueOrDeadLetter(message);
            return;
        }

        const isNew = await this.deps.idempotencyStore.markIfNew(envelope.messageId);
        if (!isNew) {
            this.deps.logger.info("Duplicate delivery after successful send, skipping re-send", {
                messageId: envelope.messageId,
                type: envelope.type,
            });
        }

        this.deps.channel.ack(message);
    }

    private async dispatch(envelope: NotificationEmailEnvelope): Promise<void> {
        switch (envelope.type) {
            case "send-confirmation-email":
                await this.deps.emailService.sendConfirmationEmail({
                    ...envelope.payload,
                    appBaseUrl: this.deps.appBaseUrl,
                });
                break;
            case "send-new-release-email":
                await this.deps.emailService.sendNewReleaseEmail({
                    ...envelope.payload,
                    appBaseUrl: this.deps.appBaseUrl,
                });
                break;
        }
    }

    private parseEnvelope(message: ConsumeMessage): NotificationEmailEnvelope | null {
        let json: unknown;
        try {
            json = JSON.parse(message.content.toString("utf-8"));
        } catch (error) {
            this.deps.logger.error("Received malformed notification command (invalid JSON)", error);
            return null;
        }

        const result = NotificationEmailEnvelopeSchema.safeParse(json);
        if (!result.success) {
            this.deps.logger.error("Received invalid notification command", undefined, {
                issues: result.error.flatten(),
            });
            return null;
        }

        return result.data;
    }

    private async requeueOrDeadLetter(message: ConsumeMessage): Promise<void> {
        const currentRetryCount = this.getRetryCount(message);
        const totalAttempts = currentRetryCount + 1;

        if (totalAttempts >= MAX_DELIVERY_ATTEMPTS) {
            await this.publishToFinalDlq(message);
            return;
        }

        const nextRetryCount = currentRetryCount + 1;
        const tier = getRetryTier(nextRetryCount);

        await this.publishAndSettle(message, NOTIFICATION_RETRY_EXCHANGE, tier.routingKey, message.content, {
            ...message.properties,
            headers: { ...message.properties.headers, [RETRY_COUNT_HEADER]: nextRetryCount },
        });
    }

    private async publishToFinalDlq(message: ConsumeMessage): Promise<void> {
        await this.publishAndSettle(message, NOTIFICATION_EMAIL_DLX, "", message.content, message.properties);
    }

    private async publishAndSettle(
        message: ConsumeMessage,
        exchange: string,
        routingKey: string,
        content: Buffer,
        options: Options.Publish,
    ): Promise<void> {
        try {
            await publishWithConfirm(
                this.deps.channel as ConfirmChannel,
                exchange,
                routingKey,
                content,
                options,
                this.deps.publishConfirmTimeoutMs,
            );
            this.deps.channel.ack(message);
        } catch (error) {
            this.deps.logger.error("Failed to confirm redirect publish, requeuing original for redelivery", error, {
                exchange,
                routingKey,
            });
            this.deps.channel.nack(message, false, true);
        }
    }

    private getRetryCount(message: ConsumeMessage): number {
        const value: unknown = message.properties.headers?.[RETRY_COUNT_HEADER];
        return typeof value === "number" ? value : 0;
    }
}
