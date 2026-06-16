import type { MessageEnvelope } from "@github-release-notifier/broker-contracts";
import type { PoolClient } from "pg";

import { pool } from "../db/pool.js";

export interface OutboxRecord {
    id: string;
    messageId: string;
    routingKey: string;
    payload: MessageEnvelope;
    attempts: number;
}

interface OutboxRow {
    id: string;
    message_id: string;
    routing_key: string;
    payload: MessageEnvelope;
    attempts: number;
}

function toOutboxRecord(row: OutboxRow): OutboxRecord {
    return {
        id: row.id,
        messageId: row.message_id,
        routingKey: row.routing_key,
        payload: row.payload,
        attempts: row.attempts,
    };
}

export interface OutboxRepositoryPort {
    enqueue(client: PoolClient, routingKey: string, envelope: MessageEnvelope): Promise<void>;
    claimBatch(limit: number, maxAttempts: number, staleProcessingMs: number): Promise<OutboxRecord[]>;
    markPublished(id: string): Promise<void>;
    markFailed(id: string, error: string): Promise<void>;
}

export class OutboxRepository implements OutboxRepositoryPort {
    async enqueue(client: PoolClient, routingKey: string, envelope: MessageEnvelope): Promise<void> {
        await client.query(
            `
            INSERT INTO notification_outbox (message_id, routing_key, payload)
            VALUES ($1, $2, $3)
            `,
            [envelope.messageId, routingKey, JSON.stringify(envelope)],
        );
    }

    /**
     * Claims pending/failed rows (under the attempt limit) as well as
     * `processing` rows whose claim is older than `staleProcessingMs` —
     * rows left behind by a worker that crashed after claiming but before
     * publishing.
     */
    async claimBatch(limit: number, maxAttempts: number, staleProcessingMs: number): Promise<OutboxRecord[]> {
        const result = await pool.query<OutboxRow>(
            `
            WITH candidate AS (
                SELECT id
                FROM notification_outbox
                WHERE (status IN ('pending', 'failed') AND attempts < $2)
                   OR (status = 'processing' AND claimed_at < NOW() - $3 * interval '1 millisecond')
                ORDER BY created_at ASC
                FOR UPDATE SKIP LOCKED
                LIMIT $1
            )
            UPDATE notification_outbox o
            SET status = 'processing', claimed_at = NOW()
            FROM candidate c
            WHERE o.id = c.id
            RETURNING o.id, o.message_id, o.routing_key, o.payload, o.attempts
            `,
            [limit, maxAttempts, staleProcessingMs],
        );

        return result.rows.map(toOutboxRecord);
    }

    async markPublished(id: string): Promise<void> {
        await pool.query(
            `
            UPDATE notification_outbox
            SET status = 'published',
                published_at = NOW(),
                last_error = NULL
            WHERE id = $1
              AND status = 'processing'
            `,
            [id],
        );
    }

    async markFailed(id: string, error: string): Promise<void> {
        await pool.query(
            `
            UPDATE notification_outbox
            SET status = 'failed',
                attempts = attempts + 1,
                last_error = $2
            WHERE id = $1
              AND status = 'processing'
            `,
            [id, error],
        );
    }
}

export const outboxRepository = new OutboxRepository();
