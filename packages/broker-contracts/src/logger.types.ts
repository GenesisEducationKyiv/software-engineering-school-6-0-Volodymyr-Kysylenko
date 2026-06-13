export interface LoggerPort {
    debug(message: string, meta?: Record<string, unknown>): void;
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, error?: unknown, meta?: Record<string, unknown>): void;
    error(message: string, error?: unknown, meta?: Record<string, unknown>): void;
}
