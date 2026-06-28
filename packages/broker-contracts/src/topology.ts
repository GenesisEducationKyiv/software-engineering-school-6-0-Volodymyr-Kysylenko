import type { Channel } from "amqplib";

export const SAGA_REPLY_EXCHANGE = "saga.replies";
export const SAGA_REPLY_QUEUE = "saga.replies.main";
export const SAGA_REPLY_ROUTING_KEY = "reply.confirmation";
export const SAGA_REPLY_DLX = "saga.replies.dlx";
export const SAGA_REPLY_DLQ = "saga.replies.dlq";

export async function assertSagaReplyTopology(channel: Channel): Promise<void> {
    await channel.assertExchange(SAGA_REPLY_EXCHANGE, "direct", { durable: true });
    await channel.assertExchange(SAGA_REPLY_DLX, "fanout", { durable: true });
    await channel.assertQueue(SAGA_REPLY_DLQ, { durable: true });
    await channel.bindQueue(SAGA_REPLY_DLQ, SAGA_REPLY_DLX, "");
    await channel.assertQueue(SAGA_REPLY_QUEUE, { durable: true, deadLetterExchange: SAGA_REPLY_DLX });
    await channel.bindQueue(SAGA_REPLY_QUEUE, SAGA_REPLY_EXCHANGE, SAGA_REPLY_ROUTING_KEY);
}

export const NOTIFICATION_EXCHANGE = "notification.commands";
export const NOTIFICATION_RETRY_EXCHANGE = "notification.commands.retry";
export const NOTIFICATION_EMAIL_QUEUE = "notification.email-commands";
export const NOTIFICATION_EMAIL_DLX = "notification.email-commands.dlx";
export const NOTIFICATION_EMAIL_DLQ = "notification.email-commands.dlq";

export const EMAIL_CONFIRMATION_ROUTING_KEY = "email.confirmation";
export const EMAIL_NEW_RELEASE_ROUTING_KEY = "email.new-release";
export const EMAIL_RETRY_ROUTING_KEY = "email.retry";

export const RETRY_COUNT_HEADER = "x-retry-count";

export const MAX_DELIVERY_ATTEMPTS = 4;

export interface RetryTier {
    queue: string;
    routingKey: string;
    ttlMs: number;
}

export const RETRY_TIERS: readonly RetryTier[] = [
    { queue: "notification.email-commands.retry.1", routingKey: "retry.1", ttlMs: 10_000 },
    { queue: "notification.email-commands.retry.2", routingKey: "retry.2", ttlMs: 60_000 },
    { queue: "notification.email-commands.retry.3", routingKey: "retry.3", ttlMs: 300_000 },
];

export function getRetryTier(attempt: number): RetryTier {
    if (attempt < 1 || attempt > RETRY_TIERS.length) {
        throw new Error(`No retry tier configured for attempt ${attempt}`);
    }
    return RETRY_TIERS[attempt - 1];
}

export async function assertNotificationTopology(channel: Channel): Promise<void> {
    await channel.assertExchange(NOTIFICATION_EXCHANGE, "topic", { durable: true });

    await channel.assertExchange(NOTIFICATION_EMAIL_DLX, "fanout", { durable: true });
    await channel.assertQueue(NOTIFICATION_EMAIL_DLQ, { durable: true });
    await channel.bindQueue(NOTIFICATION_EMAIL_DLQ, NOTIFICATION_EMAIL_DLX, "");

    await channel.assertQueue(NOTIFICATION_EMAIL_QUEUE, { durable: true });
    await channel.bindQueue(NOTIFICATION_EMAIL_QUEUE, NOTIFICATION_EXCHANGE, "email.#");

    await channel.assertExchange(NOTIFICATION_RETRY_EXCHANGE, "direct", { durable: true });
    for (const tier of RETRY_TIERS) {
        await channel.assertQueue(tier.queue, {
            durable: true,
            messageTtl: tier.ttlMs,
            deadLetterExchange: NOTIFICATION_EXCHANGE,
            deadLetterRoutingKey: EMAIL_RETRY_ROUTING_KEY,
        });
        await channel.bindQueue(tier.queue, NOTIFICATION_RETRY_EXCHANGE, tier.routingKey);
    }
}
