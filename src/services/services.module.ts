import { createClient } from "redis";

import { env } from "../config/env.js";
import { logger } from "../utils/logger/logger.js";
import { createCacheModule } from "./cache/cache.module.js";
import type { CacheClientFactory, CacheClientPort, CacheConfig } from "./cache/cache.types.js";
import { SmtpEmailClient } from "./email/email.client.js";
import { AppEmailLinkBuilder } from "./email/email.links.js";
import { createEmailModule } from "./email/email.module.js";
import { RetryingEmailClient } from "./email/email.retry.js";
import { EmailTemplateBuilder } from "./email/email.templates.js";
import { DefaultGitHubHttpClient } from "./github/github.http.js";
import { createGithubModule } from "./github/github.module.js";
import { metricsService } from "./metrics/metrics.service.js";

const smtpClient = new SmtpEmailClient({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    timeoutMs: env.EMAIL_TIMEOUT_MS,
});

const retryingEmailClient = new RetryingEmailClient(smtpClient, {
    attempts: env.EMAIL_RETRY_ATTEMPTS,
    baseDelayMs: env.EMAIL_RETRY_BASE_DELAY_MS,
    maxDelayMs: env.EMAIL_RETRY_MAX_DELAY_MS,
});

const linkBuilder = new AppEmailLinkBuilder({
    appBaseUrl: env.APP_BASE_URL,
});

const templateBuilder = new EmailTemplateBuilder(
    {
        from: env.SMTP_EMAIL_FROM,
    },
    linkBuilder,
);

const emailModule = createEmailModule({
    emailClient: retryingEmailClient,
    templateBuilder,
    metrics: metricsService,
});

const cacheConfig: CacheConfig = {
    enabled: env.CACHE_ENABLED,
    redisUrl: env.REDIS_URL,
    defaultTtlSeconds: env.REDIS_TTL_SECONDS,
};

const redisClientFactory: CacheClientFactory = (url) => createClient({ url }) as unknown as CacheClientPort;

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
