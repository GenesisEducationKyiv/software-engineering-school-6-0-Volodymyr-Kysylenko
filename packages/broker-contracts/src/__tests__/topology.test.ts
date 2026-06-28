import type { Channel } from "amqplib";
import { describe, expect, it, vi } from "vitest";

import {
    assertNotificationTopology,
    EMAIL_RETRY_ROUTING_KEY,
    getRetryTier,
    MAX_DELIVERY_ATTEMPTS,
    NOTIFICATION_EMAIL_DLQ,
    NOTIFICATION_EMAIL_DLX,
    NOTIFICATION_EMAIL_QUEUE,
    NOTIFICATION_EXCHANGE,
    NOTIFICATION_RETRY_EXCHANGE,
    RETRY_TIERS,
} from "../topology.js";

function makeChannel(): Channel {
    return {
        assertExchange: vi.fn().mockResolvedValue(undefined),
        assertQueue: vi.fn().mockResolvedValue(undefined),
        bindQueue: vi.fn().mockResolvedValue(undefined),
    } as unknown as Channel;
}

describe("getRetryTier", () => {
    it("returns the tier matching a 1-based attempt", () => {
        expect(getRetryTier(1)).toBe(RETRY_TIERS[0]);
        expect(getRetryTier(2)).toBe(RETRY_TIERS[1]);
        expect(getRetryTier(3)).toBe(RETRY_TIERS[2]);
    });

    it.each([0, -1, MAX_DELIVERY_ATTEMPTS])("throws for out-of-range attempt %i", (attempt) => {
        expect(() => getRetryTier(attempt)).toThrow(/No retry tier configured/);
    });
});

describe("assertNotificationTopology", () => {
    it("declares the main exchange, DLX/DLQ, main queue, and retry exchange/queues", async () => {
        const channel = makeChannel();

        await assertNotificationTopology(channel);

        expect(channel.assertExchange).toHaveBeenCalledWith(NOTIFICATION_EXCHANGE, "topic", { durable: true });
        expect(channel.assertExchange).toHaveBeenCalledWith(NOTIFICATION_EMAIL_DLX, "fanout", { durable: true });
        expect(channel.assertQueue).toHaveBeenCalledWith(NOTIFICATION_EMAIL_DLQ, { durable: true });
        expect(channel.bindQueue).toHaveBeenCalledWith(NOTIFICATION_EMAIL_DLQ, NOTIFICATION_EMAIL_DLX, "");

        expect(channel.assertQueue).toHaveBeenCalledWith(NOTIFICATION_EMAIL_QUEUE, { durable: true });
        expect(channel.bindQueue).toHaveBeenCalledWith(NOTIFICATION_EMAIL_QUEUE, NOTIFICATION_EXCHANGE, "email.#");

        expect(channel.assertExchange).toHaveBeenCalledWith(NOTIFICATION_RETRY_EXCHANGE, "direct", { durable: true });

        for (const tier of RETRY_TIERS) {
            expect(channel.assertQueue).toHaveBeenCalledWith(tier.queue, {
                durable: true,
                messageTtl: tier.ttlMs,
                deadLetterExchange: NOTIFICATION_EXCHANGE,
                deadLetterRoutingKey: EMAIL_RETRY_ROUTING_KEY,
            });
            expect(channel.bindQueue).toHaveBeenCalledWith(tier.queue, NOTIFICATION_RETRY_EXCHANGE, tier.routingKey);
        }
    });
});
