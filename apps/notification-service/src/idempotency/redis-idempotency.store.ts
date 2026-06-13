import { createClient } from "redis";

import type { LoggerPort } from "../utils/logger/logger.types.js";
import type { IdempotencyConfig, IdempotencyLifecyclePort, IdempotencyStorePort } from "./idempotency.types.js";

type RedisClient = ReturnType<typeof createClient>;

const KEY_PREFIX = "notification:idempotency:";

export class RedisIdempotencyStore implements IdempotencyStorePort, IdempotencyLifecyclePort {
    private readonly client: RedisClient;
    private connected = false;

    constructor(
        private readonly config: IdempotencyConfig,
        private readonly logger: LoggerPort,
    ) {
        this.client = createClient({ url: config.redisUrl });
        this.client.on("error", (error: unknown) => this.logger.error("Redis idempotency client error", error));
        this.client.on("connect", () => {
            this.connected = true;
        });
        this.client.on("end", () => {
            this.connected = false;
        });
    }

    async connect(): Promise<void> {
        await this.client.connect();
    }

    async disconnect(): Promise<void> {
        await this.client.disconnect();
    }

    isConnected(): boolean {
        return this.connected;
    }

    async markIfNew(messageId: string): Promise<boolean> {
        const result = await this.client.set(`${KEY_PREFIX}${messageId}`, "1", {
            NX: true,
            EX: this.config.ttlSeconds,
        });
        return result === "OK";
    }
}
