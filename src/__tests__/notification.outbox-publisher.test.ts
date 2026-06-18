import { NOTIFICATION_ROUTING_KEYS } from "@github-release-notifier/broker-contracts";
import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { OutboxRepositoryPort } from "../repositories/outbox.repository.js";
import { OutboxNotificationPublisher } from "../services/notification/notification.outbox-publisher.js";

describe("OutboxNotificationPublisher", () => {
    let outboxRepository: OutboxRepositoryPort;
    let publisher: OutboxNotificationPublisher;
    const client = {} as PoolClient;

    beforeEach(() => {
        outboxRepository = {
            enqueue: vi.fn().mockResolvedValue(undefined),
            claimBatch: vi.fn(),
            markPublished: vi.fn(),
            markFailed: vi.fn(),
        };
        publisher = new OutboxNotificationPublisher(outboxRepository);
    });

    it("sendConfirmationEmail() enqueues a versioned envelope with the confirmation routing key", async () => {
        await publisher.sendConfirmationEmail(client, {
            to: "user@example.com",
            repo: "owner/repo",
            confirmToken: "confirm-token",
            unsubscribeToken: "unsubscribe-token",
        });

        expect(outboxRepository.enqueue).toHaveBeenCalledTimes(1);
        const [enqueuedClient, routingKey, envelope] = (outboxRepository.enqueue as ReturnType<typeof vi.fn>).mock
            .calls[0];

        expect(enqueuedClient).toBe(client);
        expect(routingKey).toBe(NOTIFICATION_ROUTING_KEYS["send-confirmation-email"]);
        expect(envelope.type).toBe("send-confirmation-email");
        expect(envelope.payload).toEqual({
            to: "user@example.com",
            repo: "owner/repo",
            confirmToken: "confirm-token",
            unsubscribeToken: "unsubscribe-token",
        });
        expect(envelope.messageId).toMatch(/^[0-9a-f-]{36}$/);
    });

    it("sendNewReleaseEmail() enqueues a versioned envelope with the new-release routing key", async () => {
        await publisher.sendNewReleaseEmail(client, {
            to: "user@example.com",
            repo: "owner/repo",
            releaseName: "v1.2.3",
            tagName: "v1.2.3",
            releaseUrl: "https://github.com/owner/repo/releases/tag/v1.2.3",
            unsubscribeToken: "unsubscribe-token",
        });

        expect(outboxRepository.enqueue).toHaveBeenCalledTimes(1);
        const [enqueuedClient, routingKey, envelope] = (outboxRepository.enqueue as ReturnType<typeof vi.fn>).mock
            .calls[0];

        expect(enqueuedClient).toBe(client);
        expect(routingKey).toBe(NOTIFICATION_ROUTING_KEYS["send-new-release-email"]);
        expect(envelope.type).toBe("send-new-release-email");
        expect(envelope.payload).toEqual({
            to: "user@example.com",
            repo: "owner/repo",
            releaseName: "v1.2.3",
            tagName: "v1.2.3",
            releaseUrl: "https://github.com/owner/repo/releases/tag/v1.2.3",
            unsubscribeToken: "unsubscribe-token",
        });
    });
});
