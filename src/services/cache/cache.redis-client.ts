import type { createClient } from "redis";

import type { CacheClientPort } from "./cache.types.js";

type RedisClient = ReturnType<typeof createClient>;

export class RedisClientAdapter implements CacheClientPort {
    constructor(private readonly client: RedisClient) {}

    on(event: string, listener: (...args: unknown[]) => void): unknown {
        return this.client.on(event, listener as Parameters<RedisClient["on"]>[1]);
    }

    async connect(): Promise<void> {
        await this.client.connect();
    }

    async disconnect(): Promise<void> {
        await this.client.disconnect();
    }

    async get(key: string): Promise<string | null> {
        return this.client.get(key);
    }

    async setEx(key: string, ttlSeconds: number, value: string): Promise<unknown> {
        return this.client.setEx(key, ttlSeconds, value);
    }

    async del(key: string): Promise<unknown> {
        return this.client.del(key);
    }

    async flushAll(): Promise<unknown> {
        return this.client.flushAll();
    }
}
