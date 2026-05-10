import { vi } from "vitest";

import type { LoggerPort } from "../../utils/logger/logger.types.js";

export function createMockLogger(): LoggerPort {
    return {
        debug: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        error: vi.fn(),
    };
}
