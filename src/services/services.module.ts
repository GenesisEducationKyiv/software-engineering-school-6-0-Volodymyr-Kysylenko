import { createClient } from "redis";

import { env } from "../config/env.js";
import { databaseHealthCheckAdapter } from "../db/adapters/database-health-check.adapter.js";
import { subscriptionRepository } from "../repositories/subscription.repository.js";
import { createLogger } from "../utils/logger/logger.js";
import { createCacheModule } from "./cache/cache.module.js";
import { RedisClientAdapter } from "./cache/cache.redis-client.js";
import type { CacheClientFactory, CacheConfig } from "./cache/cache.types.js";
import { DefaultGitHubHttpClient } from "./github/github.http.js";
import { createGithubModule } from "./github/github.module.js";
import { createHealthModule } from "./health/health.module.js";
import type { HealthEnvironmentPort } from "./health/health.types.js";
import { createMetricsModule } from "./metrics/metrics.module.js";
import { createNotificationModule } from "./notification/notification.module.js";
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

const notificationModule = createNotificationModule({
    serviceUrl: env.NOTIFICATION_SERVICE_URL,
    timeoutMs: env.NOTIFICATION_SERVICE_TIMEOUT_MS,
    appBaseUrl: env.APP_BASE_URL,
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
    emailService: notificationModule.emailService,
    githubService: githubModule.githubService,
    subscriptionRepository,
    logger: createLogger("SubscriptionService"),
});

const scannerModule = createScannerModule({
    emailService: notificationModule.emailService,
    githubService: githubModule.githubService,
    metricsService: metricsModule.metricsService,
    subscriptionRepository,
});

export const emailService = notificationModule.emailService;
export const githubService = githubModule.githubService;
export const healthService = healthModule.healthService;
export const metricsService = metricsModule.metricsService;
export const scannerService = scannerModule.scannerService;
export const subscriptionService = subscriptionModule.subscriptionService;
export const cacheService = cacheModule.cacheService;
export const cacheLifecycle = cacheModule.cacheLifecycle;
