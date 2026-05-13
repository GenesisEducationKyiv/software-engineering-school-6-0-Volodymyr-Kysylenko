import type {
    CacheClientPort,
    CacheConnectionDependencies,
    CacheLifecyclePort,
    CacheStorePort,
} from "./cache.types.js";

export class RedisCacheConnection implements CacheStorePort, CacheLifecyclePort {
    private client: CacheClientPort | null = null;
    private connected = false;

    constructor(private readonly deps: CacheConnectionDependencies) {}

    async connect(): Promise<void> {
        if (!this.deps.config.enabled) {
            this.deps.logger.info("Cache disabled - skipping connection");
            return;
        }

        if (this.isConnected()) {
            return;
        }

        try {
            this.client = this.deps.createClient(this.deps.config.redisUrl);
            this.registerClientEvents(this.client);

            await this.client.connect();
        } catch (error) {
            this.deps.logger.error("Failed to connect to cache:", error);
            this.client = null;
            this.connected = false;
        }
    }

    async disconnect(): Promise<void> {
        if (this.client && this.connected) {
            await this.client.disconnect();
            this.client = null;
            this.connected = false;
            this.deps.logger.info("Cache client disconnected");
        }
    }

    isConnected(): boolean {
        return this.connected && this.client !== null;
    }

    async getRaw(key: string): Promise<string | null> {
        return this.client?.get(key) ?? null;
    }

    async setRaw(key: string, value: string, ttlSeconds: number): Promise<void> {
        await this.client?.setEx(key, ttlSeconds, value);
    }

    async del(key: string): Promise<void> {
        await this.client?.del(key);
    }

    async flush(): Promise<void> {
        await this.client?.flushAll();
    }

    private registerClientEvents(client: CacheClientPort): void {
        client.on("error", (err) => {
            this.deps.logger.error("Cache client error:", err);
            this.connected = false;
        });

        client.on("connect", () => {
            this.deps.logger.info("Cache client connected");
            this.connected = true;
        });

        client.on("disconnect", () => {
            this.deps.logger.warn("Cache client disconnected");
            this.connected = false;
        });
    }
}
