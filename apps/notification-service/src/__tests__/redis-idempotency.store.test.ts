import { createClient } from "redis";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { RedisIdempotencyStore } from "../idempotency/redis-idempotency.store.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";

vi.mock("redis", () => ({
    createClient: vi.fn(),
}));

function makeLogger(): LoggerPort {
    return { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
}

function makeFakeClient() {
    const handlers = new Map<string, (...args: unknown[]) => void>();
    return {
        on: vi.fn((event: string, handler: (...args: unknown[]) => void) => {
            handlers.set(event, handler);
        }),
        connect: vi.fn().mockResolvedValue(undefined),
        disconnect: vi.fn().mockResolvedValue(undefined),
        set: vi.fn(),
        del: vi.fn(),
        emit: (event: string, ...args: unknown[]) => handlers.get(event)?.(...args),
    };
}

const createClientMock = createClient as unknown as ReturnType<typeof vi.fn>;

describe("RedisIdempotencyStore", () => {
    let client: ReturnType<typeof makeFakeClient>;

    beforeEach(() => {
        client = makeFakeClient();
        createClientMock.mockReturnValue(client);
    });

    it("connects and reports connected after a successful connect", async () => {
        const store = new RedisIdempotencyStore({ redisUrl: "redis://localhost:6379", ttlSeconds: 60 }, makeLogger());

        expect(store.isConnected()).toBe(false);

        await store.connect();
        client.emit("connect");

        expect(client.connect).toHaveBeenCalledTimes(1);
        expect(store.isConnected()).toBe(true);
    });

    it("reports disconnected after the client emits 'end'", async () => {
        const store = new RedisIdempotencyStore({ redisUrl: "redis://localhost:6379", ttlSeconds: 60 }, makeLogger());

        await store.connect();
        client.emit("connect");
        expect(store.isConnected()).toBe(true);

        client.emit("end");
        expect(store.isConnected()).toBe(false);
    });

    it("markIfNew() returns true and sets the key with NX/EX when the message is new", async () => {
        client.set.mockResolvedValue("OK");
        const store = new RedisIdempotencyStore(
            { redisUrl: "redis://localhost:6379", ttlSeconds: 86400 },
            makeLogger(),
        );

        const isNew = await store.markIfNew("11111111-1111-1111-1111-111111111111");

        expect(isNew).toBe(true);
        expect(client.set).toHaveBeenCalledWith("notification:idempotency:11111111-1111-1111-1111-111111111111", "1", {
            NX: true,
            EX: 86400,
        });
    });

    it("markIfNew() returns false when the key already exists", async () => {
        client.set.mockResolvedValue(null);
        const store = new RedisIdempotencyStore(
            { redisUrl: "redis://localhost:6379", ttlSeconds: 86400 },
            makeLogger(),
        );

        const isNew = await store.markIfNew("11111111-1111-1111-1111-111111111111");

        expect(isNew).toBe(false);
    });

    it("logs an error when the underlying client emits an 'error' event", () => {
        const logger = makeLogger();
        new RedisIdempotencyStore({ redisUrl: "redis://localhost:6379", ttlSeconds: 60 }, logger);

        const error = new Error("connection refused");
        client.emit("error", error);

        expect(logger.error).toHaveBeenCalledWith("Redis idempotency client error", error);
    });

    it("disconnect() calls through to the underlying client", async () => {
        const store = new RedisIdempotencyStore({ redisUrl: "redis://localhost:6379", ttlSeconds: 60 }, makeLogger());

        await store.disconnect();

        expect(client.disconnect).toHaveBeenCalledTimes(1);
    });

    it("release() calls DEL with the prefixed key", async () => {
        client.del.mockResolvedValue(1);
        const store = new RedisIdempotencyStore(
            { redisUrl: "redis://localhost:6379", ttlSeconds: 86400 },
            makeLogger(),
        );

        await store.release("11111111-1111-1111-1111-111111111111");

        expect(client.del).toHaveBeenCalledWith("notification:idempotency:11111111-1111-1111-1111-111111111111");
    });
});
