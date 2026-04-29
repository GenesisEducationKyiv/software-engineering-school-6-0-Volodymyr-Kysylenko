import { createClient, RedisClientType } from "redis";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

class CacheService {
    private client: RedisClientType | null = null;
    private connected = false;

    async connect(): Promise<void> {
        if (!env.CACHE_ENABLED) {
            logger.info("Cache disabled - skipping Redis connection");
            return;
        }

        try {
            this.client = createClient({
                url: env.REDIS_URL,
            });

            this.client.on("error", (err) => {
                logger.error("Redis client error:", err);
                this.connected = false;
            });

            this.client.on("connect", () => {
                logger.info("Redis client connected");
                this.connected = true;
            });

            this.client.on("disconnect", () => {
                logger.warn("Redis client disconnected");
                this.connected = false;
            });

            await this.client.connect();
        } catch (error) {
            logger.error("Failed to connect to Redis:", error);
            this.client = null;
            this.connected = false;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client && this.connected) {
            await this.client.disconnect();
            this.client = null;
            this.connected = false;
            logger.info("Redis client disconnected");
        }
    }

    async get<T>(key: string): Promise<T | null> {
        if (!this.isAvailable()) {
            return null;
        }

        try {
            if (!this.client) {
                return null;
            }
            const cached = await this.client.get(key);
            if (!cached) {
                return null;
            }

            return JSON.parse(cached) as T;
        } catch (error) {
            logger.error("Cache get error:", { key, error });
            return null;
        }
    }

    async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
        if (!this.isAvailable()) {
            return;
        }

        try {
            const ttl = ttlSeconds ?? env.REDIS_TTL_SECONDS;
            if (this.client) {
                await this.client.setEx(key, ttl, JSON.stringify(value));
            }
        } catch (error) {
            logger.error("Cache set error:", { key, error });
        }
    }

    async del(key: string): Promise<void> {
        if (!this.isAvailable()) {
            return;
        }

        try {
            if (this.client) {
                await this.client.del(key);
            }
        } catch (error) {
            logger.error("Cache delete error:", { key, error });
        }
    }

    async flush(): Promise<void> {
        if (!this.isAvailable()) {
            return;
        }

        try {
            if (this.client) {
                await this.client.flushAll();
            }
        } catch (error) {
            logger.error("Cache flush error:", error);
        }
    }

    isConnected(): boolean {
        return this.connected && this.client !== null;
    }

    private isAvailable(): boolean {
        return env.CACHE_ENABLED && this.connected && this.client !== null;
    }

    static generateKey(prefix: string, ...parts: string[]): string {
        return `${prefix}:${parts.join(":")}`;
    }
}

export const cacheService = new CacheService();
export { CacheService };
