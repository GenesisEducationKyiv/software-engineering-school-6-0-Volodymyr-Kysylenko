export function buildCacheKey(prefix: string, ...parts: string[]): string {
    return `${prefix}:${parts.join(":")}`;
}
