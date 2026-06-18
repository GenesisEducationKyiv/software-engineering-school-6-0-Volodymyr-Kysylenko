import type { MessageEnvelope } from "@github-release-notifier/broker-contracts";
import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { pool } from "../db/pool.js";
import { OutboxRepository } from "../repositories/outbox.repository.js";

vi.mock("../db/pool.js", () => ({
    pool: { query: vi.fn() },
}));

const poolQueryMock = pool.query as unknown as ReturnType<typeof vi.fn>;

function makeEnvelope(): MessageEnvelope {
    return {
        messageId: "11111111-1111-1111-1111-111111111111",
        type: "send-confirmation-email",
        version: 1,
        timestamp: new Date().toISOString(),
        correlationId: "corr-1",
        causationId: null,
        payload: { to: "user@example.com" },
    };
}

describe("OutboxRepository", () => {
    let repository: OutboxRepository;

    beforeEach(() => {
        repository = new OutboxRepository();
        poolQueryMock.mockReset();
    });

    it("enqueue() inserts the envelope as JSON on the caller's transaction client", async () => {
        const envelope = makeEnvelope();
        const client = { query: vi.fn().mockResolvedValue({ rows: [] }) } as unknown as PoolClient;

        await repository.enqueue(client, "email.confirmation", envelope);

        expect(client.query).toHaveBeenCalledWith(expect.stringContaining("INSERT INTO notification_outbox"), [
            envelope.messageId,
            "email.confirmation",
            JSON.stringify(envelope),
        ]);
        expect(poolQueryMock).not.toHaveBeenCalled();
    });

    it("claimBatch() returns claimed rows mapped to camelCase records", async () => {
        const envelope = makeEnvelope();
        poolQueryMock.mockResolvedValue({
            rows: [
                {
                    id: "outbox-1",
                    message_id: envelope.messageId,
                    routing_key: "email.confirmation",
                    payload: envelope,
                    attempts: 0,
                },
            ],
        });

        const records = await repository.claimBatch(20, 5, 60_000);

        expect(poolQueryMock).toHaveBeenCalledWith(expect.stringContaining("FOR UPDATE SKIP LOCKED"), [20, 5, 60_000]);
        expect(records).toEqual([
            {
                id: "outbox-1",
                messageId: envelope.messageId,
                routingKey: "email.confirmation",
                payload: envelope,
                attempts: 0,
            },
        ]);
    });

    it("markPublished() updates status to published only when row is still processing", async () => {
        poolQueryMock.mockResolvedValue({ rows: [] });

        await repository.markPublished("outbox-1");

        const [sql] = poolQueryMock.mock.calls[0] as [string, unknown[]];
        expect(sql).toContain("status = 'published'");
        expect(sql).toContain("AND status = 'processing'");
        expect(poolQueryMock).toHaveBeenCalledWith(expect.anything(), ["outbox-1"]);
    });

    it("markFailed() increments attempts and stores the error only when row is still processing", async () => {
        poolQueryMock.mockResolvedValue({ rows: [] });

        await repository.markFailed("outbox-1", "connection refused");

        const [sql] = poolQueryMock.mock.calls[0] as [string, unknown[]];
        expect(sql).toContain("attempts = attempts + 1");
        expect(sql).toContain("AND status = 'processing'");
        expect(poolQueryMock).toHaveBeenCalledWith(expect.anything(), ["outbox-1", "connection refused"]);
    });
});
