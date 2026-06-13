import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z
    .object({
        NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
        PORT: z.coerce.number().int().positive().default(4000),
        LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

        // public URL of the main app (used to build links in emails)
        APP_BASE_URL: z.string().url().default("http://localhost:3000"),

        RABBITMQ_URL: z.string().min(1).default("amqp://guest:guest@localhost:5672"),
        RABBITMQ_PREFETCH: z.coerce.number().int().positive().default(5),
        RABBITMQ_PUBLISH_CONFIRM_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),

        REDIS_URL: z.string().url().default("redis://localhost:6379"),
        IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().positive().default(86400),

        SMTP_HOST: z.string().min(1).default("localhost"),
        SMTP_PORT: z.coerce.number().int().positive().default(1025),
        SMTP_SECURE: z
            .string()
            .optional()
            .default("false")
            .transform((v) => v === "true"),
        SMTP_EMAIL_FROM: z.string().email().default("test@example.com"),
        SMTP_USER: z.string().optional(),
        SMTP_PASS: z.string().optional(),
        EMAIL_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
        EMAIL_RETRY_ATTEMPTS: z.coerce.number().int().positive().default(3),
        EMAIL_RETRY_BASE_DELAY_MS: z.coerce.number().int().positive().default(1000),
        EMAIL_RETRY_MAX_DELAY_MS: z.coerce.number().int().positive().default(10000),
        SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().positive().default(35000),
    })
    .refine((data) => Boolean(data.SMTP_USER) === Boolean(data.SMTP_PASS), {
        message: "SMTP_USER and SMTP_PASS must be set together",
        path: ["SMTP_PASS"],
    });

export const env = EnvSchema.parse(process.env);
