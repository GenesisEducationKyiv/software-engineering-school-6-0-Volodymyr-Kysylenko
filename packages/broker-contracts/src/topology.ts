import type { Channel } from "amqplib";

export const NOTIFICATION_EXCHANGE = "notification.commands";
export const NOTIFICATION_RETRY_EXCHANGE = "notification.commands.retry";
export const NOTIFICATION_EMAIL_QUEUE = "notification.email-commands";
export const NOTIFICATION_EMAIL_DLX = "notification.email-commands.dlx";
export const NOTIFICATION_EMAIL_DLQ = "notification.email-commands.dlq";

export const EMAIL_CONFIRMATION_ROUTING_KEY = "email.confirmation";
export const EMAIL_NEW_RELEASE_ROUTING_KEY = "email.new-release";
export const EMAIL_RETRY_ROUTING_KEY = "email.retry";

/** Header used to track how many delivery attempts a message has had. */
export const RETRY_COUNT_HEADER = "x-retry-count";

/** 1 initial delivery + 3 retries before a message is sent to the DLQ. */
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
    const tier = RETRY_TIERS.at(attempt - 1);
    if (!tier) {
        throw new Error(`No retry tier configured for attempt ${attempt}`);
    }
    return tier;
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
