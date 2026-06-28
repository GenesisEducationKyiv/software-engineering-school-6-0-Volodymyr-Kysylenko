import type { PoolClient } from "pg";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { pool } from "../db/pool.js";
import { withTransaction } from "../db/transaction.js";

vi.mock("../db/pool.js", () => ({
    pool: { connect: vi.fn() },
}));

const poolConnectMock = pool.connect as unknown as ReturnType<typeof vi.fn>;

function makeClient(): PoolClient {
    return {
        query: vi.fn().mockResolvedValue({ rows: [] }),
        release: vi.fn(),
    } as unknown as PoolClient;
}

describe("withTransaction", () => {
    beforeEach(() => {
        poolConnectMock.mockReset();
    });

    it("commits and returns the callback result on success", async () => {
        const client = makeClient();
        poolConnectMock.mockResolvedValue(client);

        const result = await withTransaction(async (c) => {
            await c.query("INSERT INTO foo VALUES (1)");
            return "ok";
        });

        expect(result).toBe("ok");
        expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
        expect(client.query).toHaveBeenNthCalledWith(2, "INSERT INTO foo VALUES (1)");
        expect(client.query).toHaveBeenNthCalledWith(3, "COMMIT");
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("rolls back and rethrows if the callback fails", async () => {
        const client = makeClient();
        poolConnectMock.mockResolvedValue(client);

        await expect(
            withTransaction(() => {
                throw new Error("boom");
            }),
        ).rejects.toThrow("boom");

        expect(client.query).toHaveBeenNthCalledWith(1, "BEGIN");
        expect(client.query).toHaveBeenNthCalledWith(2, "ROLLBACK");
        expect(client.query).not.toHaveBeenCalledWith("COMMIT");
        expect(client.release).toHaveBeenCalledTimes(1);
    });

    it("throws AggregateError containing both errors when ROLLBACK itself also fails", async () => {
        const client = makeClient();
        (client.query as ReturnType<typeof vi.fn>).mockImplementation(async (sql: string) => {
            if (sql === "ROLLBACK") {
                return Promise.reject(new Error("rollback failed"));
            }
            return Promise.resolve({ rows: [] });
        });
        poolConnectMock.mockResolvedValue(client);

        const err = await withTransaction(() => {
            throw new Error("boom");
        }).catch((e: unknown) => e);

        expect(err).toBeInstanceOf(AggregateError);
        expect((err as AggregateError).errors[0]).toMatchObject({ message: "boom" });
        expect((err as AggregateError).errors[1]).toMatchObject({ message: "rollback failed" });
        expect(client.release).toHaveBeenCalledTimes(1);
    });
});
