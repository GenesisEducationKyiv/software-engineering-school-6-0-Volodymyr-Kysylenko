import type { CacheLifecyclePort } from "../cache.types.js";

export class NoOpCacheLifecycle implements CacheLifecyclePort {
    async connect(): Promise<void> {
        // no-op
    }

    async disconnect(): Promise<void> {
        // no-op
    }

    isConnected(): boolean {
        return false;
    }
}
