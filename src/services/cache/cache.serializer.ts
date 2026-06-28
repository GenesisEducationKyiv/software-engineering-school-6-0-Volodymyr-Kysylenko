import type { CacheSerializerPort } from "./cache.types.js";

export class JsonCacheSerializer implements CacheSerializerPort {
    serialize(value: unknown): string {
        return JSON.stringify(value);
    }

    deserialize<T>(value: string): T {
        return JSON.parse(value) as T;
    }
}
