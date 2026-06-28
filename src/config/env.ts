import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
    // application
    NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
    PORT: z.coerce.number().int().positive().default(3000),
    GRPC_PORT: z.coerce.number().int().positive().default(50051),
    APP_BASE_URL: z.string().url().default("http://localhost:3000"),
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

    // database
    DATABASE_URL: z.string().min(1),
    DB_MAX_CONNECTIONS: z.coerce.number().int().positive().default(20),
    DB_IDLE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    DB_CONNECTION_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

    // security & rate limiting
    RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(300000), // 5 minutes
    RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
    BODY_LIMIT: z.string().default("10kb"),

    // scanner
    SCAN_INTERVAL_MS: z.coerce.number().int().positive().default(300000),

    // GitHub API
    GITHUB_TOKEN: z.string().optional(),
    GITHUB_API_TIMEOUT_MS: z.coerce.number().int().positive().default(10000),

    // Redis cache
    REDIS_URL: z.string().url().optional().default("redis://localhost:6379"),
    REDIS_TTL_SECONDS: z.coerce.number().int().positive().default(600),
    CACHE_ENABLED: z
        .string()
        .optional()
        .default("true")
        .transform((value) => value === "true"),

    // monitoring & health
    HEALTH_CHECK_INTERVAL_MS: z.coerce.number().int().positive().default(30000),
    METRICS_ENABLED: z
        .string()
        .optional()
        .default("true")
        .transform((value) => value === "true"),

    // notification microservice
    NOTIFICATION_SERVICE_URL: z.string().url().default("http://localhost:4000"),
    NOTIFICATION_SERVICE_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
});

export const env = EnvSchema.parse(process.env);
