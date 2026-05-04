import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { env } from "../config/env.js";
import { CacheService, cacheService } from "../services/cache.service.js";

describe("Cache Service", () => {
    beforeAll(async () => {
        if (env.CACHE_ENABLED) {
            await cacheService.connect();
        }
    });

    afterAll(async () => {
        if (env.CACHE_ENABLED && cacheService.isConnected()) {
            await cacheService.flush();
            await cacheService.disconnect();
        }
    });

    it("should set and get cache values", async () => {
        if (!env.CACHE_ENABLED) {
            const key = "test:key";
            const value = { message: "test data", timestamp: Date.now() };

            await cacheService.set(key, value);
            const cached = await cacheService.get(key);

            expect(cached).toBeNull();
            return;
        }

        const key = "test:key";
        const value = { message: "test data", timestamp: Date.now() };

        await cacheService.set(key, value);
        const cached = await cacheService.get(key);

        expect(cached).toEqual(value);
    });

    it("should return null for non-existent keys", async () => {
        const result = await cacheService.get("non:existent:key");
        expect(result).toBeNull();
    });

    it("should delete cache entries", async () => {
        if (!env.CACHE_ENABLED) {
            const key = "test:delete";
            const value = "delete me";

            await cacheService.set(key, value);
            await cacheService.del(key);
            const deletedValue = await cacheService.get(key);
            expect(deletedValue).toBeNull();
            return;
        }

        const key = "test:delete";
        const value = "delete me";

        await cacheService.set(key, value);
        const cached = await cacheService.get(key);
        expect(cached).toBe(value);

        await cacheService.del(key);
        const deletedValue = await cacheService.get(key);
        expect(deletedValue).toBeNull();
    });

    it("should handle TTL expiration", async () => {
        if (!env.CACHE_ENABLED) {
            expect(true).toBe(true);
            return;
        }

        const key = "test:ttl";
        const value = "expires soon";
        const ttlSeconds = 1;

        await cacheService.set(key, value, ttlSeconds);
        const cachedBefore = await cacheService.get(key);
        expect(cachedBefore).toBe(value);

        await new Promise((resolve) => setTimeout(resolve, 1200));

        const cachedAfter = await cacheService.get(key);
        expect(cachedAfter).toBeNull();
    });

    it("should generate proper cache keys", () => {
        const key1 = CacheService.generateKey("github", "owner", "repo");
        expect(key1).toBe("github:owner:repo");

        const key2 = CacheService.generateKey("releases", "microsoft", "vscode", "latest");
        expect(key2).toBe("releases:microsoft:vscode:latest");
    });
});
