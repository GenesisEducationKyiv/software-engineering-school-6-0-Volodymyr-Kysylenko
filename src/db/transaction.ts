import type { PoolClient } from "pg";

import { pool } from "./pool.js";

export type TransactionRunner = <T>(fn: (client: PoolClient) => Promise<T>) => Promise<T>;

export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");
        const result = await fn(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        try {
            await client.query("ROLLBACK");
        } catch (rollbackError) {
            throw new AggregateError([error, rollbackError], "Transaction and ROLLBACK both failed");
        }
        throw error;
    } finally {
        client.release();
    }
}
