import type { CacheEntry, CacheServiceDependencies, CacheServicePort } from "./cache.types.js";

export class CacheService implements CacheServicePort {
    constructor(private readonly deps: CacheServiceDependencies) {}

    async get<T>(key: string): Promise<T | null> {
        const entry = await this.getEntry<T>(key);

        return entry.hit ? entry.value : null;
    }

    async getEntry<T>(key: string): Promise<CacheEntry<T>> {
        try {
            const cached = await this.deps.store.getRaw(key);
            if (cached === null) {
                return { hit: false, value: null };
            }

            return { hit: true, value: this.deps.serializer.deserialize<T>(cached) };
        } catch (error) {
            this.deps.logger.error("Cache get error:", { key, error });
            return { hit: false, value: null };
        }
    }

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        try {
            const ttl = ttlSeconds ?? this.deps.config.defaultTtlSeconds;
            await this.deps.store.setRaw(key, this.deps.serializer.serialize(value), ttl);
        } catch (error) {
            this.deps.logger.error("Cache set error:", { key, error });
        }
    }

    async del(key: string): Promise<void> {
        try {
            await this.deps.store.del(key);
        } catch (error) {
            this.deps.logger.error("Cache delete error:", { key, error });
        }
    }

    async flush(): Promise<void> {
        try {
            await this.deps.store.flush();
        } catch (error) {
            this.deps.logger.error("Cache flush error:", error);
        }
    }
}
