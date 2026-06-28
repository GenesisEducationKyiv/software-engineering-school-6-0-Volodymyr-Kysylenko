import {
    NOTIFICATION_EMAIL_DLX,
    NOTIFICATION_RETRY_EXCHANGE,
    type NotificationEmailEnvelope,
    RETRY_COUNT_HEADER,
} from "@github-release-notifier/broker-contracts";
import type { ConsumeMessage } from "amqplib";
import { describe, expect, it, vi } from "vitest";

import type { IdempotencyStorePort } from "../idempotency/idempotency.types.js";
import { NotificationConsumer, type NotificationConsumerChannel } from "../messaging/notification.consumer.js";
import type { EmailServicePort } from "../services/email/email.types.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";

const APP_BASE_URL = "http://localhost:3000";
const PUBLISH_CONFIRM_TIMEOUT_MS = 1000;

function makeEnvelope(): NotificationEmailEnvelope {
    return {
        messageId: "11111111-1111-1111-1111-111111111111",
        type: "send-confirmation-email",
        version: 1,
        timestamp: new Date().toISOString(),
        correlationId: "22222222-2222-2222-2222-222222222222",
        causationId: null,
        payload: {
            to: "user@example.com",
            repo: "owner/repo",
            confirmToken: "confirm-token",
            unsubscribeToken: "unsubscribe-token",
        },
    };
}

function makeMessage(body: unknown, headers?: Record<string, unknown>): ConsumeMessage {
    return {
        content: Buffer.from(JSON.stringify(body)),
        fields: {} as ConsumeMessage["fields"],
        properties: { headers } as ConsumeMessage["properties"],
    };
}

function makeChannel(): NotificationConsumerChannel & {
    ack: ReturnType<typeof vi.fn>;
    nack: ReturnType<typeof vi.fn>;
    publish: ReturnType<typeof vi.fn>;
    consume: ReturnType<typeof vi.fn>;
} {
    return {
        consume: vi.fn(),
        ack: vi.fn(),
        nack: vi.fn(),
        publish: vi.fn((_exchange, _routingKey, _content, _options, callback?: (err: Error | null) => void) => {
            callback?.(null);
            return true;
        }),
    };
}

function makeEmailService(): EmailServicePort & {
    sendConfirmationEmail: ReturnType<typeof vi.fn>;
    sendNewReleaseEmail: ReturnType<typeof vi.fn>;
} {
    return {
        verifyConnection: vi.fn().mockResolvedValue(undefined),
        close: vi.fn().mockResolvedValue(undefined),
        sendConfirmationEmail: vi.fn().mockResolvedValue(undefined),
        sendNewReleaseEmail: vi.fn().mockResolvedValue(undefined),
    };
}

function makeIdempotencyStore(isNew = true): IdempotencyStorePort & {
    markIfNew: ReturnType<typeof vi.fn>;
    release: ReturnType<typeof vi.fn>;
} {
    return {
        markIfNew: vi.fn().mockResolvedValue(isNew),
        release: vi.fn().mockResolvedValue(undefined),
    };
}

function makeLogger(): LoggerPort {
    return {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
}

describe("NotificationConsumer", () => {
    it("dispatches a send-confirmation-email command and acks the message", async () => {
        const channel = makeChannel();
        const emailService = makeEmailService();
        const idempotencyStore = makeIdempotencyStore();
        const consumer = new NotificationConsumer({
            channel,
            emailService,
            idempotencyStore,
            logger: makeLogger(),
            appBaseUrl: APP_BASE_URL,
            publishConfirmTimeoutMs: PUBLISH_CONFIRM_TIMEOUT_MS,
        });

        const envelope = makeEnvelope();
        const message = makeMessage(envelope);

        await consumer.handleMessage(message);

        expect(idempotencyStore.markIfNew).toHaveBeenCalledWith(envelope.messageId);
        expect(emailService.sendConfirmationEmail).toHaveBeenCalledWith({
            ...envelope.payload,
            appBaseUrl: APP_BASE_URL,
        });
        expect(channel.ack).toHaveBeenCalledWith(message);
        expect(channel.publish).not.toHaveBeenCalled();
    });

    it("dispatches a send-new-release-email command and acks the message", async () => {
        const channel = makeChannel();
        const emailService = makeEmailService();
        const idempotencyStore = makeIdempotencyStore();
        const consumer = new NotificationConsumer({
            channel,
            emailService,
            idempotencyStore,
            logger: makeLogger(),
            appBaseUrl: APP_BASE_URL,
            publishConfirmTimeoutMs: PUBLISH_CONFIRM_TIMEOUT_MS,
        });

        const envelope: NotificationEmailEnvelope = {
            messageId: "33333333-3333-3333-3333-333333333333",
            type: "send-new-release-email",
            version: 1,
            timestamp: new Date().toISOString(),
            correlationId: "44444444-4444-4444-4444-444444444444",
            causationId: null,
            payload: {
                to: "user@example.com",
                repo: "owner/repo",
                releaseName: "v1.2.0",
                tagName: "v1.2.0",
                releaseUrl: "https://github.com/owner/repo/releases/tag/v1.2.0",
                unsubscribeToken: "unsubscribe-token",
            },
        };
        const message = makeMessage(envelope);

        await consumer.handleMessage(message);

        expect(emailService.sendNewReleaseEmail).toHaveBeenCalledWith({
            ...envelope.payload,
            appBaseUrl: APP_BASE_URL,
        });
        expect(channel.ack).toHaveBeenCalledWith(message);
        expect(channel.publish).not.toHaveBeenCalled();
    });

    it("skips dispatch and acks without sending when a duplicate delivery is detected", async () => {
        const channel = makeChannel();
        const emailService = makeEmailService();
        const idempotencyStore = makeIdempotencyStore(false);
        const logger = makeLogger();
        const consumer = new NotificationConsumer({
            channel,
            emailService,
            idempotencyStore,
            logger,
            appBaseUrl: APP_BASE_URL,
            publishConfirmTimeoutMs: PUBLISH_CONFIRM_TIMEOUT_MS,
        });

        const envelope = makeEnvelope();
        const message = makeMessage(envelope);

        await consumer.handleMessage(message);

        expect(idempotencyStore.markIfNew).toHaveBeenCalledWith(envelope.messageId);
        expect(emailService.sendConfirmationEmail).not.toHaveBeenCalled();
        expect(channel.ack).toHaveBeenCalledWith(message);
        expect(channel.publish).not.toHaveBeenCalled();
        expect(logger.info).toHaveBeenCalled();
    });

    it("routes malformed JSON straight to the final DLQ and acks the message", async () => {
        const channel = makeChannel();
        const emailService = makeEmailService();
        const idempotencyStore = makeIdempotencyStore();
        const logger = makeLogger();
        const consumer = new NotificationConsumer({
            channel,
            emailService,
            idempotencyStore,
            logger,
            appBaseUrl: APP_BASE_URL,
            publishConfirmTimeoutMs: PUBLISH_CONFIRM_TIMEOUT_MS,
        });

        const message: ConsumeMessage = {
            content: Buffer.from("not-json"),
            fields: {} as ConsumeMessage["fields"],
            properties: {} as ConsumeMessage["properties"],
        };

        await consumer.handleMessage(message);

        expect(idempotencyStore.markIfNew).not.toHaveBeenCalled();
        expect(emailService.sendConfirmationEmail).not.toHaveBeenCalled();
        expect(channel.publish).toHaveBeenCalledWith(
            NOTIFICATION_EMAIL_DLX,
            "",
            message.content,
            message.properties,
            expect.any(Function),
        );
        expect(channel.ack).toHaveBeenCalledWith(message);
        expect(logger.error).toHaveBeenCalled();
    });

    it("routes envelopes that fail schema validation straight to the final DLQ", async () => {
        const channel = makeChannel();
        const emailService = makeEmailService();
        const idempotencyStore = makeIdempotencyStore();
        const logger = makeLogger();
        const consumer = new NotificationConsumer({
            channel,
            emailService,
            idempotencyStore,
            logger,
            appBaseUrl: APP_BASE_URL,
            publishConfirmTimeoutMs: PUBLISH_CONFIRM_TIMEOUT_MS,
        });

        const envelope = { ...makeEnvelope(), payload: { ...makeEnvelope().payload, to: "not-an-email" } };
        const message = makeMessage(envelope);

        await consumer.handleMessage(message);

        expect(emailService.sendConfirmationEmail).not.toHaveBeenCalled();
        expect(channel.publish).toHaveBeenCalledWith(
            NOTIFICATION_EMAIL_DLX,
            "",
            message.content,
            message.properties,
            expect.any(Function),
        );
        expect(channel.ack).toHaveBeenCalledWith(message);
        expect(logger.error).toHaveBeenCalled();
    });

    it("requeues to the first retry tier on the initial delivery failure", async () => {
        const channel = makeChannel();
        const emailService = makeEmailService();
        emailService.sendConfirmationEmail.mockRejectedValue(new Error("SMTP unavailable"));
        const idempotencyStore = makeIdempotencyStore();
        const logger = makeLogger();
        const consumer = new NotificationConsumer({
            channel,
            emailService,
            idempotencyStore,
            logger,
            appBaseUrl: APP_BASE_URL,
            publishConfirmTimeoutMs: PUBLISH_CONFIRM_TIMEOUT_MS,
        });

        const envelope = makeEnvelope();
        const message = makeMessage(envelope);

        await consumer.handleMessage(message);

        expect(channel.publish).toHaveBeenCalledWith(
            NOTIFICATION_RETRY_EXCHANGE,
            "retry.1",
            message.content,
            { headers: { [RETRY_COUNT_HEADER]: 1 } },
            expect.any(Function),
        );
        expect(channel.ack).toHaveBeenCalledWith(message);
        expect(logger.error).toHaveBeenCalled();
        expect(idempotencyStore.markIfNew).toHaveBeenCalledWith(envelope.messageId);
        expect(idempotencyStore.release).toHaveBeenCalledWith(envelope.messageId);
    });

    it("nacks with requeue instead of acking when the retry-tier publish isn't confirmed by the broker", async () => {
        const channel = makeChannel();
        channel.publish.mockImplementation(
            (
                _exchange: string,
                _routingKey: string,
                _content: Buffer,
                _options: unknown,
                callback?: (err: Error | null) => void,
            ) => {
                callback?.(new Error("channel closed"));
                return true;
            },
        );
        const emailService = makeEmailService();
        emailService.sendConfirmationEmail.mockRejectedValue(new Error("SMTP unavailable"));
        const idempotencyStore = makeIdempotencyStore();
        const logger = makeLogger();
        const consumer = new NotificationConsumer({
            channel,
            emailService,
            idempotencyStore,
            logger,
            appBaseUrl: APP_BASE_URL,
            publishConfirmTimeoutMs: PUBLISH_CONFIRM_TIMEOUT_MS,
        });

        const envelope = makeEnvelope();
        const message = makeMessage(envelope);

        await consumer.handleMessage(message);

        expect(channel.nack).toHaveBeenCalledWith(message, false, true);
        expect(channel.ack).not.toHaveBeenCalled();
        expect(logger.error).toHaveBeenCalledWith(
            "Failed to confirm redirect publish, requeuing original for redelivery",
            expect.any(Error),
            expect.objectContaining({ exchange: NOTIFICATION_RETRY_EXCHANGE }),
        );
        expect(idempotencyStore.release).toHaveBeenCalledWith(envelope.messageId);
    });

    it("requeues to the second retry tier when retried once before", async () => {
        const channel = makeChannel();
        const emailService = makeEmailService();
        emailService.sendConfirmationEmail.mockRejectedValue(new Error("SMTP unavailable"));
        const idempotencyStore = makeIdempotencyStore();
        const consumer = new NotificationConsumer({
            channel,
            emailService,
            idempotencyStore,
            logger: makeLogger(),
            appBaseUrl: APP_BASE_URL,
            publishConfirmTimeoutMs: PUBLISH_CONFIRM_TIMEOUT_MS,
        });

        const envelope = makeEnvelope();
        const message = makeMessage(envelope, { [RETRY_COUNT_HEADER]: 1 });

        await consumer.handleMessage(message);

        expect(channel.publish).toHaveBeenCalledWith(
            NOTIFICATION_RETRY_EXCHANGE,
            "retry.2",
            message.content,
            { headers: { [RETRY_COUNT_HEADER]: 2 } },
            expect.any(Function),
        );
        expect(channel.ack).toHaveBeenCalledWith(message);
        expect(idempotencyStore.release).toHaveBeenCalledWith(envelope.messageId);
    });

    it("routes to the final DLQ once the max delivery attempts have been exhausted", async () => {
        const channel = makeChannel();
        const emailService = makeEmailService();
        emailService.sendConfirmationEmail.mockRejectedValue(new Error("SMTP unavailable"));
        const idempotencyStore = makeIdempotencyStore();
        const consumer = new NotificationConsumer({
            channel,
            emailService,
            idempotencyStore,
            logger: makeLogger(),
            appBaseUrl: APP_BASE_URL,
            publishConfirmTimeoutMs: PUBLISH_CONFIRM_TIMEOUT_MS,
        });

        const envelope = makeEnvelope();
        const message = makeMessage(envelope, { [RETRY_COUNT_HEADER]: 3 });

        await consumer.handleMessage(message);

        expect(channel.publish).toHaveBeenCalledWith(
            NOTIFICATION_EMAIL_DLX,
            "",
            message.content,
            message.properties,
            expect.any(Function),
        );
        expect(channel.ack).toHaveBeenCalledWith(message);
        expect(idempotencyStore.release).toHaveBeenCalledWith(envelope.messageId);
    });

    it.each([NaN, -1, 1.5, "2"])(
        "treats an invalid retry-count header (%s) as 0 and routes to retry.1",
        async (badValue) => {
            const channel = makeChannel();
            const emailService = makeEmailService();
            emailService.sendConfirmationEmail.mockRejectedValue(new Error("SMTP unavailable"));
            const idempotencyStore = makeIdempotencyStore();
            const consumer = new NotificationConsumer({
                channel,
                emailService,
                idempotencyStore,
                logger: makeLogger(),
                appBaseUrl: APP_BASE_URL,
                publishConfirmTimeoutMs: PUBLISH_CONFIRM_TIMEOUT_MS,
            });

            const envelope = makeEnvelope();
            const message = makeMessage(envelope, { [RETRY_COUNT_HEADER]: badValue });

            await consumer.handleMessage(message);

            expect(channel.publish).toHaveBeenCalledWith(
                NOTIFICATION_RETRY_EXCHANGE,
                "retry.1",
                message.content,
                expect.objectContaining({ headers: expect.objectContaining({ [RETRY_COUNT_HEADER]: 1 }) }),
                expect.any(Function),
            );
        },
    );

    it("nacks with requeue when the idempotency store throws during markIfNew", async () => {
        const channel = makeChannel();
        const emailService = makeEmailService();
        const idempotencyStore = makeIdempotencyStore();
        idempotencyStore.markIfNew.mockRejectedValue(new Error("Redis unavailable"));
        const logger = makeLogger();
        const consumer = new NotificationConsumer({
            channel,
            emailService,
            idempotencyStore,
            logger,
            appBaseUrl: APP_BASE_URL,
            publishConfirmTimeoutMs: PUBLISH_CONFIRM_TIMEOUT_MS,
        });

        const envelope = makeEnvelope();
        const message = makeMessage(envelope);

        await consumer.handleMessage(message);

        expect(emailService.sendConfirmationEmail).not.toHaveBeenCalled();
        expect(channel.ack).not.toHaveBeenCalled();
        expect(channel.nack).toHaveBeenCalledWith(message, false, true);
        expect(logger.error).toHaveBeenCalled();
    });

    it("still requeues correctly when release throws after a dispatch failure", async () => {
        const channel = makeChannel();
        const emailService = makeEmailService();
        emailService.sendConfirmationEmail.mockRejectedValue(new Error("SMTP unavailable"));
        const idempotencyStore = makeIdempotencyStore();
        idempotencyStore.release.mockRejectedValue(new Error("Redis unavailable"));
        const logger = makeLogger();
        const consumer = new NotificationConsumer({
            channel,
            emailService,
            idempotencyStore,
            logger,
            appBaseUrl: APP_BASE_URL,
            publishConfirmTimeoutMs: PUBLISH_CONFIRM_TIMEOUT_MS,
        });

        const envelope = makeEnvelope();
        const message = makeMessage(envelope);

        await consumer.handleMessage(message);

        expect(channel.publish).toHaveBeenCalledWith(
            NOTIFICATION_RETRY_EXCHANGE,
            "retry.1",
            message.content,
            { headers: { [RETRY_COUNT_HEADER]: 1 } },
            expect.any(Function),
        );
        expect(channel.ack).toHaveBeenCalledWith(message);
        expect(channel.nack).not.toHaveBeenCalled();
    });

    it("does nothing when message is null (consumer cancelled)", async () => {
        const channel = makeChannel();
        const emailService = makeEmailService();
        const idempotencyStore = makeIdempotencyStore();
        const consumer = new NotificationConsumer({
            channel,
            emailService,
            idempotencyStore,
            logger: makeLogger(),
            appBaseUrl: APP_BASE_URL,
            publishConfirmTimeoutMs: PUBLISH_CONFIRM_TIMEOUT_MS,
        });

        await consumer.handleMessage(null);

        expect(channel.ack).not.toHaveBeenCalled();
        expect(channel.publish).not.toHaveBeenCalled();
        expect(emailService.sendConfirmationEmail).not.toHaveBeenCalled();
        expect(emailService.sendNewReleaseEmail).not.toHaveBeenCalled();
    });
});
