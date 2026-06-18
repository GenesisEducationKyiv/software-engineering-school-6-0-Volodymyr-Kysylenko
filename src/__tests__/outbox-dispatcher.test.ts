import { NOTIFICATION_EXCHANGE } from "@github-release-notifier/broker-contracts";
import type { ConfirmChannel } from "amqplib";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { OutboxDispatcher } from "../outbox-worker/outbox-dispatcher.js";
import type { OutboxRecord, OutboxRepositoryPort } from "../repositories/outbox.repository.js";

function makeRecord(overrides: Partial<OutboxRecord> = {}): OutboxRecord {
    return {
        id: "outbox-1",
        messageId: "11111111-1111-1111-1111-111111111111",
        routingKey: "email.confirmation",
        payload: {
            messageId: "11111111-1111-1111-1111-111111111111",
            type: "send-confirmation-email",
            version: 1,
            timestamp: new Date().toISOString(),
            correlationId: "corr-1",
            causationId: null,
            payload: { to: "user@example.com" },
        },
        attempts: 0,
        ...overrides,
    };
}

function makeChannel(publishImpl: ConfirmChannel["publish"]): ConfirmChannel {
    return { publish: vi.fn(publishImpl) } as unknown as ConfirmChannel;
}

describe("OutboxDispatcher", () => {
    let outboxRepository: OutboxRepositoryPort;
    let logger: {
        info: ReturnType<typeof vi.fn>;
        warn: ReturnType<typeof vi.fn>;
        error: ReturnType<typeof vi.fn>;
        debug: ReturnType<typeof vi.fn>;
    };

    beforeEach(() => {
        outboxRepository = {
            enqueue: vi.fn(),
            claimBatch: vi.fn(),
            markPublished: vi.fn().mockResolvedValue(undefined),
            markFailed: vi.fn().mockResolvedValue(undefined),
        };
        logger = { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() };
    });

    it("publishes claimed rows and marks them published on confirm", async () => {
        const record = makeRecord();
        (outboxRepository.claimBatch as ReturnType<typeof vi.fn>).mockResolvedValue([record]);

        const channel = makeChannel((_exchange, _routingKey, _content, _options, callback) => {
            callback?.(null, {});
            return true;
        });

        const dispatcher = new OutboxDispatcher({
            outboxRepository,
            getChannel: () => channel,
            logger,
            batchSize: 20,
            maxAttempts: 5,
            staleProcessingMs: 60_000,
            publishConfirmTimeoutMs: 1000,
        });

        const dispatched = await dispatcher.dispatchBatch();

        expect(dispatched).toBe(1);
        expect(channel.publish).toHaveBeenCalledWith(
            NOTIFICATION_EXCHANGE,
            record.routingKey,
            Buffer.from(JSON.stringify(record.payload)),
            { persistent: true, contentType: "application/json", messageId: record.messageId },
            expect.any(Function),
        );
        expect(outboxRepository.markPublished).toHaveBeenCalledWith(record.id);
        expect(outboxRepository.markFailed).not.toHaveBeenCalled();
    });

    it("marks a row failed if the publisher confirm reports an error", async () => {
        const record = makeRecord();
        (outboxRepository.claimBatch as ReturnType<typeof vi.fn>).mockResolvedValue([record]);

        const channel = makeChannel((_exchange, _routingKey, _content, _options, callback) => {
            callback?.(new Error("channel closed"), {});
            return true;
        });

        const dispatcher = new OutboxDispatcher({
            outboxRepository,
            getChannel: () => channel,
            logger,
            batchSize: 20,
            maxAttempts: 5,
            staleProcessingMs: 60_000,
            publishConfirmTimeoutMs: 1000,
        });

        await dispatcher.dispatchBatch();

        expect(outboxRepository.markPublished).not.toHaveBeenCalled();
        expect(outboxRepository.markFailed).toHaveBeenCalledWith(record.id, "channel closed");
        expect(logger.error).toHaveBeenCalled();
    });

    it("skips the batch without claiming or marking rows when getChannel() returns null (broker disconnected)", async () => {
        const dispatcher = new OutboxDispatcher({
            outboxRepository,
            getChannel: () => null,
            logger,
            batchSize: 20,
            maxAttempts: 5,
            staleProcessingMs: 60_000,
            publishConfirmTimeoutMs: 1000,
        });

        const dispatched = await dispatcher.dispatchBatch();

        expect(dispatched).toBe(0);
        expect(outboxRepository.claimBatch).not.toHaveBeenCalled();
        expect(outboxRepository.markFailed).not.toHaveBeenCalled();
    });

    it("returns 0 and does nothing when there are no claimable rows", async () => {
        (outboxRepository.claimBatch as ReturnType<typeof vi.fn>).mockResolvedValue([]);

        const dispatcher = new OutboxDispatcher({
            outboxRepository,
            getChannel: () => makeChannel(() => true),
            logger,
            batchSize: 20,
            maxAttempts: 5,
            staleProcessingMs: 60_000,
            publishConfirmTimeoutMs: 1000,
        });

        expect(await dispatcher.dispatchBatch()).toBe(0);
        expect(outboxRepository.markPublished).not.toHaveBeenCalled();
        expect(outboxRepository.markFailed).not.toHaveBeenCalled();
    });
});
