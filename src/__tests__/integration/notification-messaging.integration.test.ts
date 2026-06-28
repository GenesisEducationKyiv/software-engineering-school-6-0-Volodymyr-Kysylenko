import { execFile } from "node:child_process";
import { promisify } from "node:util";

import {
    assertNotificationTopology,
    createEnvelope,
    NOTIFICATION_CONTRACT_VERSION,
    NOTIFICATION_EMAIL_DLQ,
    NOTIFICATION_EMAIL_DLX,
    NOTIFICATION_EMAIL_QUEUE,
    NOTIFICATION_EXCHANGE,
    NOTIFICATION_RETRY_EXCHANGE,
    NOTIFICATION_ROUTING_KEYS,
    RETRY_TIERS,
} from "@github-release-notifier/broker-contracts";
import amqp, { type Channel, type ChannelModel, type GetMessage } from "amqplib";
import { createClient } from "redis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { env } from "../../config/env.js";
import { runMigrations } from "../../db/migrate.js";
import { pool } from "../../db/pool.js";
import { withTransaction } from "../../db/transaction.js";
import { OutboxDispatcher } from "../../outbox-worker/outbox-dispatcher.js";
import { outboxRepository } from "../../repositories/outbox.repository.js";
import { createLogger } from "../../utils/logger/logger.js";

const execFileAsync = promisify(execFile);
const logger = createLogger("notification-messaging.integration.test");
const RETRY_TIER_1 = RETRY_TIERS[0];
const MAILHOG_API_URL = "http://localhost:8025";

async function checkEntity(connection: ChannelModel, check: (channel: Channel) => Promise<unknown>): Promise<boolean> {
    const channel = await connection.createChannel();
    try {
        await check(channel);
        return true;
    } catch {
        return false;
    } finally {
        await channel.close().catch(() => undefined);
    }
}

async function waitForMessage(connection: ChannelModel, queue: string, timeoutMs: number): Promise<GetMessage | null> {
    const channel = await connection.createChannel();
    const deadline = Date.now() + timeoutMs;

    try {
        while (Date.now() < deadline) {
            const message = await channel.get(queue, {});
            if (message) {
                channel.ack(message);
                return message;
            }
            await new Promise((resolve) => setTimeout(resolve, 200));
        }
        return null;
    } finally {
        await channel.close().catch(() => undefined);
    }
}

interface MailhogMessage {
    Content: { Headers: Record<string, string[]> };
}

async function clearMailhog(): Promise<void> {
    await fetch(`${MAILHOG_API_URL}/api/v1/messages`, { method: "DELETE" });
}

async function waitForEmail(to: string, timeoutMs: number): Promise<MailhogMessage | null> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const response = await fetch(`${MAILHOG_API_URL}/api/v2/messages`);
        const data = (await response.json()) as { items: MailhogMessage[] };
        const match = data.items.find((item) => item.Content.Headers.To.some((header) => header.includes(to)));
        if (match) {
            return match;
        }
        await new Promise((resolve) => setTimeout(resolve, 300));
    }
    return null;
}

async function waitForOutboxStatus(messageId: string, status: string, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        const result = await pool.query<{ status: string }>(
            "SELECT status FROM notification_outbox WHERE message_id = $1",
            [messageId],
        );
        if (result.rows[0]?.status === status) {
            return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return false;
}

function makeConfirmationPayload(to: string) {
    return {
        to,
        repo: "owner/repo",
        confirmToken: "confirm-token",
        unsubscribeToken: "unsubscribe-token",
    };
}

describe("Notification messaging integration", () => {
    let connection: ChannelModel | undefined;
    let canConnect = false;
    const redis = createClient({ url: env.REDIS_URL });

    beforeAll(async () => {
        try {
            await pool.query("SELECT 1");
            await runMigrations();

            connection = await amqp.connect(env.RABBITMQ_URL);
            const setupChannel = await connection.createChannel();
            await assertNotificationTopology(setupChannel);
            await setupChannel.close();

            await redis.connect();

            // Stop the outbox-worker container so it doesn't race the
            // in-test OutboxDispatcher for rows inserted by these tests.
            await execFileAsync("docker", ["compose", "-f", "docker-compose.test.yml", "stop", "outbox-worker"]);

            canConnect = true;
        } catch (error) {
            console.warn("Skipping notification messaging integration tests:", error);
            canConnect = false;
        }
    });

    afterAll(async () => {
        if (canConnect) {
            await execFileAsync("docker", ["compose", "-f", "docker-compose.test.yml", "start", "outbox-worker"]).catch(
                () => undefined,
            );
        }
        if (redis.isOpen) {
            await redis.disconnect();
        }
        if (connection) {
            await connection.close();
        }
        if (canConnect) {
            await pool.end();
        }
    });

    beforeEach(async () => {
        if (!canConnect || !connection) {
            return;
        }

        await pool.query("TRUNCATE TABLE notification_outbox");

        const channel = await connection.createChannel();
        await channel.purgeQueue(NOTIFICATION_EMAIL_QUEUE);
        await channel.purgeQueue(NOTIFICATION_EMAIL_DLQ);
        for (const tier of RETRY_TIERS) {
            await channel.purgeQueue(tier.queue);
        }
        await channel.close();
    });

    it("declares the full notification topology", async (ctx) => {
        if (!canConnect || !connection) {
            ctx.skip();
            return;
        }

        expect(await checkEntity(connection, async (channel) => channel.checkExchange(NOTIFICATION_EXCHANGE))).toBe(
            true,
        );
        expect(
            await checkEntity(connection, async (channel) => channel.checkExchange(NOTIFICATION_RETRY_EXCHANGE)),
        ).toBe(true);
        expect(await checkEntity(connection, async (channel) => channel.checkExchange(NOTIFICATION_EMAIL_DLX))).toBe(
            true,
        );
        expect(await checkEntity(connection, async (channel) => channel.checkQueue(NOTIFICATION_EMAIL_QUEUE))).toBe(
            true,
        );
        expect(await checkEntity(connection, async (channel) => channel.checkQueue(NOTIFICATION_EMAIL_DLQ))).toBe(true);

        for (const tier of RETRY_TIERS) {
            expect(await checkEntity(connection, async (channel) => channel.checkQueue(tier.queue))).toBe(true);
        }
    });

    it("publishes an enqueued outbox row, delivers it to the consumer, and marks it published", async (ctx) => {
        if (!canConnect || !connection) {
            ctx.skip();
            return;
        }

        await clearMailhog();

        const envelope = createEnvelope({
            type: "send-confirmation-email",
            version: NOTIFICATION_CONTRACT_VERSION,
            payload: makeConfirmationPayload("outbox-roundtrip@example.com"),
        });
        const routingKey = NOTIFICATION_ROUTING_KEYS["send-confirmation-email"];

        await withTransaction(async (client) => {
            await outboxRepository.enqueue(client, routingKey, envelope);
        });

        const confirmChannel = await connection.createConfirmChannel();
        const dispatcher = new OutboxDispatcher({
            outboxRepository,
            getChannel: () => confirmChannel,
            logger,
            batchSize: 20,
            maxAttempts: 5,
            staleProcessingMs: env.OUTBOX_STALE_PROCESSING_MS,
            publishConfirmTimeoutMs: env.RABBITMQ_PUBLISH_CONFIRM_TIMEOUT_MS,
        });

        await dispatcher.dispatchBatch();
        await confirmChannel.close();

        expect(await waitForOutboxStatus(envelope.messageId, "published", 10_000)).toBe(true);

        const email = await waitForEmail("outbox-roundtrip@example.com", 10_000);
        expect(email).not.toBeNull();
    }, 20_000);

    it("leaves the outbox row untouched when the broker is unavailable, so it can be retried without burning attempts", async (ctx) => {
        if (!canConnect) {
            ctx.skip();
            return;
        }

        const envelope = createEnvelope({
            type: "send-confirmation-email",
            version: NOTIFICATION_CONTRACT_VERSION,
            payload: makeConfirmationPayload("disconnected@example.com"),
        });
        const routingKey = NOTIFICATION_ROUTING_KEYS["send-confirmation-email"];

        await withTransaction(async (client) => {
            await outboxRepository.enqueue(client, routingKey, envelope);
        });

        const dispatcher = new OutboxDispatcher({
            outboxRepository,
            getChannel: () => null,
            logger,
            batchSize: 20,
            maxAttempts: 5,
            staleProcessingMs: env.OUTBOX_STALE_PROCESSING_MS,
            publishConfirmTimeoutMs: env.RABBITMQ_PUBLISH_CONFIRM_TIMEOUT_MS,
        });

        const dispatched = await dispatcher.dispatchBatch();
        expect(dispatched).toBe(0);

        const row = await pool.query<{ status: string; attempts: number; last_error: string | null }>(
            "SELECT status, attempts, last_error FROM notification_outbox WHERE message_id = $1",
            [envelope.messageId],
        );
        expect(row.rows[0]?.status).toBe("pending");
        expect(row.rows[0]?.attempts).toBe(0);
        expect(row.rows[0]?.last_error).toBeNull();
    });

    it(
        "dead-letters a retry-tier message back to the main exchange after TTL expiry, redelivering to the consumer",
        async (ctx) => {
            if (!canConnect || !connection) {
                ctx.skip();
                return;
            }

            await clearMailhog();

            const envelope = createEnvelope({
                type: "send-confirmation-email",
                version: NOTIFICATION_CONTRACT_VERSION,
                payload: makeConfirmationPayload("retry-tier@example.com"),
            });

            const channel = await connection.createConfirmChannel();
            await new Promise<void>((resolve, reject) => {
                channel.publish(
                    NOTIFICATION_RETRY_EXCHANGE,
                    RETRY_TIER_1.routingKey,
                    Buffer.from(JSON.stringify(envelope)),
                    { persistent: true, contentType: "application/json", messageId: envelope.messageId },
                    (err) => (err ? reject(err) : resolve()),
                );
            });
            await channel.close();

            const email = await waitForEmail("retry-tier@example.com", RETRY_TIER_1.ttlMs + 10_000);
            expect(email).not.toBeNull();
        },
        RETRY_TIER_1.ttlMs + 15_000,
    );

    it("routes messages published to the final DLX into the DLQ", async (ctx) => {
        if (!canConnect || !connection) {
            ctx.skip();
            return;
        }

        const messageId = "33333333-3333-3333-3333-333333333333";
        const channel = await connection.createConfirmChannel();

        await new Promise<void>((resolve, reject) => {
            channel.publish(
                NOTIFICATION_EMAIL_DLX,
                "",
                Buffer.from(JSON.stringify({ messageId })),
                { persistent: true, messageId },
                (err) => (err ? reject(err) : resolve()),
            );
        });
        await channel.close();

        const message = await waitForMessage(connection, NOTIFICATION_EMAIL_DLQ, 5000);
        expect(message).not.toBeNull();
        expect(JSON.parse(message?.content.toString() ?? "")).toMatchObject({ messageId });
    });

    it("enforces idempotency via Redis SET NX EX", async (ctx) => {
        if (!canConnect) {
            ctx.skip();
            return;
        }

        const key = "notification:idempotency:44444444-4444-4444-4444-444444444444";
        await redis.del(key);

        const first = await redis.set(key, "1", { NX: true, EX: 86400 });
        const second = await redis.set(key, "1", { NX: true, EX: 86400 });

        expect(first).toBe("OK");
        expect(second).toBeNull();
    });
});
