export interface IdempotencyConfig {
    redisUrl: string;
    ttlSeconds: number;
}

export interface IdempotencyLifecyclePort {
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    isConnected(): boolean;
}

export interface IdempotencyStorePort {
    markIfNew(messageId: string): Promise<boolean>;
}
