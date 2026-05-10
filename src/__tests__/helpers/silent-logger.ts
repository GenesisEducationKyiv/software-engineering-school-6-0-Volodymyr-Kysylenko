import type { LoggerPort } from "../../utils/logger/logger.types.js";

export function createSilentLogger(): LoggerPort {
    return {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
        debug: () => undefined,
    };
}
