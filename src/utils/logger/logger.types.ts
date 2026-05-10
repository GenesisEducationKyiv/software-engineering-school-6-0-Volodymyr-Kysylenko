export interface LoggerDebugPort {
    debug(message: string, meta?: Record<string, unknown>): void;
}

export interface LoggerInfoPort {
    info(message: string, meta?: Record<string, unknown>): void;
}

export interface LoggerWarnPort {
    warn(message: string, error?: unknown, meta?: Record<string, unknown>): void;
}

export interface LoggerErrorPort {
    error(message: string, error?: unknown, meta?: Record<string, unknown>): void;
}

export interface LoggerPort extends LoggerDebugPort, LoggerInfoPort, LoggerWarnPort, LoggerErrorPort {}
