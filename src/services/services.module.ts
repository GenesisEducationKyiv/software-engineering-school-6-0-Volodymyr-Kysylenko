import { createClient } from "redis";

import { env } from "../config/env.js";
import { logger } from "../utils/logger/logger.js";
import { createCacheModule } from "./cache/cache.module.js";
import { RedisClientAdapter } from "./cache/cache.redis-client.js";
import type { CacheClientFactory, CacheConfig } from "./cache/cache.types.js";
import { createEmailModule } from "./email/email.module.js";
import { DefaultGitHubHttpClient } from "./github/github.http.js";
import { createGithubModule } from "./github/github.module.js";
import { metricsService } from "./metrics/metrics.service.js";

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
    logger,
    metrics: metricsService,
});

const cacheConfig: CacheConfig = {
    enabled: env.CACHE_ENABLED,
    redisUrl: env.REDIS_URL,
    defaultTtlSeconds: env.REDIS_TTL_SECONDS,
};

const redisClientFactory: CacheClientFactory = (url) => new RedisClientAdapter(createClient({ url }));

const cacheModule = createCacheModule({
    config: cacheConfig,
    logger,
    createClient: redisClientFactory,
});

const githubModule = createGithubModule({
    httpClient: new DefaultGitHubHttpClient(env.GITHUB_API_TIMEOUT_MS, fetch),
    cache: cacheModule.cacheService,
    logger,
    metrics: metricsService,
    githubToken: env.GITHUB_TOKEN,
});

export const emailService = emailModule.emailService;
export const githubService = githubModule.githubService;
export const cacheService = cacheModule.cacheService;
export const cacheLifecycle = cacheModule.cacheLifecycle;
