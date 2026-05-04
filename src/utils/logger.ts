import { env } from "../config/env.js";

export interface Logger {
    info(message: string, meta?: Record<string, unknown>): void;
    warn(message: string, meta?: Record<string, unknown>): void;
    error(message: string, error?: unknown, meta?: Record<string, unknown>): void;
    debug(message: string, meta?: Record<string, unknown>): void;
}
export class ConsoleLogger implements Logger {
    private logLevels = ["error", "warn", "info", "debug"];

    constructor(private context = "App") {}

    private shouldLog(level: string): boolean {
        const currentLevelIndex = this.logLevels.indexOf(env.LOG_LEVEL);
        const messageLevelIndex = this.logLevels.indexOf(level);
        return messageLevelIndex <= currentLevelIndex;
    }

    info(message: string, meta?: Record<string, unknown>): void {
        if (this.shouldLog("info")) {
            this.log("INFO", message, meta);
        }
    }

    warn(message: string, meta?: Record<string, unknown>): void {
        if (this.shouldLog("warn")) {
            this.log("WARN", message, meta);
        }
    }

    error(message: string, error?: unknown, meta?: Record<string, unknown>): void {
        if (this.shouldLog("error")) {
            const errorMeta =
                error instanceof Error
                    ? { error: error.message, stack: error.stack, ...meta }
                    : { error: String(error), ...meta };
            this.log("ERROR", message, errorMeta);
        }
    }

    debug(message: string, meta?: Record<string, unknown>): void {
        if (this.shouldLog("debug")) {
            this.log("DEBUG", message, meta);
        }
    }

    private log(level: string, message: string, meta?: Record<string, unknown>): void {
        const timestamp = new Date().toISOString();
        const logEntry = {
            timestamp,
            level,
            context: this.context,
            message,
            ...meta,
        };

        console.log(JSON.stringify(logEntry));
    }
}

export const logger = new ConsoleLogger();
