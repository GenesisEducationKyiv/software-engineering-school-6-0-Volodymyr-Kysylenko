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

    // SMTP
    SMTP_HOST: z.string().min(1).default("localhost"),
    SMTP_PORT: z.coerce.number().int().positive().default(1025),
    SMTP_SECURE: z
        .string()
        .optional()
        .default("false")
        .transform((value) => value === "true"),
    SMTP_EMAIL_FROM: z.string().email().default("test@example.com"),
    SMTP_USER: z.string().optional(),
    SMTP_PASS: z.string().optional(),
    EMAIL_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
    EMAIL_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),

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
});

export const env = EnvSchema.parse(process.env);
