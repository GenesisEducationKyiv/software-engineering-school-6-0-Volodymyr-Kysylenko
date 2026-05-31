import type { LoggerPort } from "../../utils/logger/logger.types.js";

export interface CacheServicePort {
    getEntry<T>(key: string): Promise<CacheEntry<T>>;
    get<T>(key: string): Promise<T | null>;
    set(key: string, value: unknown, ttlSeconds?: number): Promise<void>;
    del(key: string): Promise<void>;
    flush(): Promise<void>;
}

export type CacheEntry<T> = { hit: true; value: T } | { hit: false; value: null };

export interface CacheConfig {
    enabled: boolean;
    redisUrl: string;
    defaultTtlSeconds: number;
}

export interface CacheStorePort {
    getRaw(key: string): Promise<string | null>;
    setRaw(key: string, value: string, ttlSeconds: number): Promise<void>;
    del(key: string): Promise<void>;
    flush(): Promise<void>;
}

export interface CacheLifecyclePort {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}

export interface CacheSerializerPort {
    serialize(value: unknown): string;
    deserialize<T>(value: string): T;
}

export interface CacheClientPort {
    on(event: string, listener: (...args: unknown[]) => void): unknown;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    get(key: string): Promise<string | null>;
    setEx(key: string, ttlSeconds: number, value: string): Promise<unknown>;
    del(key: string): Promise<unknown>;
    flushAll(): Promise<unknown>;
}

export type CacheClientFactory = (url: string) => CacheClientPort;

export interface CacheServiceDependencies {
    config: Pick<CacheConfig, "defaultTtlSeconds">;
    logger: LoggerPort;
    store: CacheStorePort & CacheLifecyclePort;
    serializer: CacheSerializerPort;
}

export interface CacheConnectionDependencies {
    config: Pick<CacheConfig, "redisUrl">;
    logger: LoggerPort;
    createClient: CacheClientFactory;
}
