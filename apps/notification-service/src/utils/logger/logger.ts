import { readFileSync } from "fs";
import { hostname } from "os";
import { join } from "path";
import { createLogger as winstonCreateLogger, format, transports } from "winston";

import { env } from "../../config/env.js";
import type { LoggerPort } from "./logger.types.js";

const SERVICE_NAME = "notification-service";

const SERVICE_VERSION = (() => {
    if (process.env.npm_package_version) return process.env.npm_package_version;
    if (process.env.APP_VERSION) return process.env.APP_VERSION;
    try {
        const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8")) as {
            version?: string;
        };
        return pkg.version ?? "unknown";
    } catch {
        return "unknown";
    }
})();

function serializeError(error: unknown): Record<string, unknown> {
    if (error instanceof Error) {
        return { errorMessage: error.message, errorName: error.name, stack: error.stack };
    }
    return { errorMessage: String(error) };
}

function resolveArgs(errorOrMeta?: unknown, meta?: Record<string, unknown>): Record<string, unknown> {
    if (errorOrMeta === undefined) return meta ?? {};
    if (
        typeof errorOrMeta === "object" &&
        errorOrMeta !== null &&
        !(errorOrMeta instanceof Error) &&
        !Array.isArray(errorOrMeta)
    ) {
        return { ...(errorOrMeta as Record<string, unknown>), ...meta };
    }
    return { ...serializeError(errorOrMeta), ...meta };
}

export type { LoggerPort as Logger };

export class ConsoleLogger implements LoggerPort {
    private readonly winston;

    constructor(context = "App") {
        this.winston = winstonCreateLogger({
            level: env.LOG_LEVEL,
            format: format.combine(format.timestamp({ format: "YYYY-MM-DDTHH:mm:ss.SSSZ" }), format.json()),
            defaultMeta: {
                service: SERVICE_NAME,
                version: SERVICE_VERSION,
                environment: env.NODE_ENV,
                context,
                hostname: hostname(),
            },
            transports: [new transports.Console()],
        });
    }

    info(message: string, meta?: Record<string, unknown>): void {
        this.winston.info(message, meta);
    }

    warn(message: string, errorOrMeta?: unknown, meta?: Record<string, unknown>): void {
        this.winston.warn(message, resolveArgs(errorOrMeta, meta));
    }

    error(message: string, errorOrMeta?: unknown, meta?: Record<string, unknown>): void {
        this.winston.error(message, resolveArgs(errorOrMeta, meta));
    }

    debug(message: string, meta?: Record<string, unknown>): void {
        this.winston.debug(message, meta);
    }
}

export function createLogger(context: string): ConsoleLogger {
    return new ConsoleLogger(context);
}

export const logger = new ConsoleLogger();
