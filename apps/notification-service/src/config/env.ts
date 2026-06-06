import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
    PORT: z.coerce.number().int().positive().default(4000),
    LOG_LEVEL: z.enum(["error", "warn", "info", "debug"]).default("info"),

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
});

export const env = EnvSchema.parse(process.env);
