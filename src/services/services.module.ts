import { createClient } from "redis";

import { env } from "../config/env.js";
import { databaseHealthCheckAdapter } from "../db/adapters/database-health-check.adapter.js";
import { subscriptionRepository } from "../repositories/subscription.repository.js";
import { createLogger } from "../utils/logger/logger.js";
import { createCacheModule } from "./cache/cache.module.js";
import { RedisClientAdapter } from "./cache/cache.redis-client.js";
import type { CacheClientFactory, CacheConfig } from "./cache/cache.types.js";
import { createEmailModule } from "./email/email.module.js";
import { DefaultGitHubHttpClient } from "./github/github.http.js";
import { createGithubModule } from "./github/github.module.js";
import { createHealthModule } from "./health/health.module.js";
import type { HealthEnvironmentPort } from "./health/health.types.js";
import { createMetricsModule } from "./metrics/metrics.module.js";
import { createScannerModule } from "./scanner/scanner.module.js";
import { createSubscriptionModule } from "./subscription/subscription.module.js";

const metricsModule = createMetricsModule({ logger: createLogger("MetricsService"), subscriptionRepository });

const healthEnvironment: HealthEnvironmentPort = {
    getNow: () => new Date(),
    getUptime: () => process.uptime(),
    getVersion: () => process.env.npm_package_version ?? "1.0.0",
};

const healthModule = createHealthModule({
    databaseHealthCheck: databaseHealthCheckAdapter,
    environment: healthEnvironment,
    subscriptionRepository,
});

const emailModule = createEmailModule({
    config: {
        smtp: {
            host: env.SMTP_HOST,
            port: env.SMTP_PORT,
            secure: env.SMTP_SECURE,
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
            timeoutMs: env.EMAIL_TIMEOUT_MS,
            from: env.SMTP_EMAIL_FROM,
        },
        retry: {
            attempts: env.EMAIL_RETRY_ATTEMPTS,
            baseDelayMs: env.EMAIL_RETRY_BASE_DELAY_MS,
            maxDelayMs: env.EMAIL_RETRY_MAX_DELAY_MS,
        },
        appBaseUrl: env.APP_BASE_URL,
    },
    logger: createLogger("EmailService"),
    metrics: metricsModule.metricsService,
});

const cacheConfig: CacheConfig = {
    enabled: env.CACHE_ENABLED,
    redisUrl: env.REDIS_URL,
    defaultTtlSeconds: env.REDIS_TTL_SECONDS,
};

const redisClientFactory: CacheClientFactory = (url) => new RedisClientAdapter(createClient({ url }));

const cacheModule = createCacheModule({
    config: cacheConfig,
    logger: createLogger("CacheService"),
    createClient: redisClientFactory,
});

const githubModule = createGithubModule({
    httpClient: new DefaultGitHubHttpClient(env.GITHUB_API_TIMEOUT_MS, fetch),
    cache: cacheModule.cacheService,
    logger: createLogger("GitHubService"),
    metrics: metricsModule.metricsService,
    githubToken: env.GITHUB_TOKEN,
});

const subscriptionModule = createSubscriptionModule({
    emailService: emailModule.emailService,
    githubService: githubModule.githubService,
    subscriptionRepository,
    logger: createLogger("SubscriptionService"),
});

const scannerModule = createScannerModule({
    emailService: emailModule.emailService,
    githubService: githubModule.githubService,
    metricsService: metricsModule.metricsService,
    subscriptionRepository,
});

export const emailService = emailModule.emailService;
export const githubService = githubModule.githubService;
export const healthService = healthModule.healthService;
export const metricsService = metricsModule.metricsService;
export const scannerService = scannerModule.scannerService;
export const subscriptionService = subscriptionModule.subscriptionService;
export const cacheService = cacheModule.cacheService;
export const cacheLifecycle = cacheModule.cacheLifecycle;
