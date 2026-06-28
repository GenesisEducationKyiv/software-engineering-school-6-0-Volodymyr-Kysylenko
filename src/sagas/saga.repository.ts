import type { Pool, PoolClient } from "pg";

import { pool } from "../db/pool.js";

export interface CreateSagaInput {
    correlationId: string;
    subscriptionId: string;
}

export interface SagaRepositoryPort {
    create(client: PoolClient, input: CreateSagaInput): Promise<void>;
    complete(correlationId: string): Promise<void>;
    fail(correlationId: string, error?: string): Promise<void>;
}

export class SagaRepository implements SagaRepositoryPort {
    constructor(private readonly pool: Pool) {}

    async create(client: PoolClient, input: CreateSagaInput): Promise<void> {
        await client.query(
            `INSERT INTO saga_instances (correlation_id, type, payload)
             VALUES ($1, 'subscription-confirmation', $2)`,
            [input.correlationId, JSON.stringify({ subscriptionId: input.subscriptionId })],
        );
    }

    async complete(correlationId: string): Promise<void> {
        await this.pool.query(
            `UPDATE saga_instances
             SET status = 'completed', updated_at = NOW()
             WHERE correlation_id = $1 AND status = 'started'`,
            [correlationId],
        );
    }

    async fail(correlationId: string, error?: string): Promise<void> {
        await this.pool.query(
            `UPDATE saga_instances
             SET status = 'failed', last_error = $2, updated_at = NOW()
             WHERE correlation_id = $1 AND status = 'started'`,
            [correlationId, error ?? null],
        );
    }
}

export const sagaRepository = new SagaRepository(pool);
