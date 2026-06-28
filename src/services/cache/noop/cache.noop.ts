import type { CacheEntry, CacheServicePort } from "../cache.types.js";

export class NoOpCacheService implements CacheServicePort {
    async get<T>(): Promise<T | null> {
        return Promise.resolve(null);
    }

    async getEntry<T>(): Promise<CacheEntry<T>> {
        return Promise.resolve({ hit: false, value: null });
    }

    async set(): Promise<void> {
        // no-op
    }

    async del(): Promise<void> {
        // no-op
    }

    async flush(): Promise<void> {
        // no-op
    }
}
