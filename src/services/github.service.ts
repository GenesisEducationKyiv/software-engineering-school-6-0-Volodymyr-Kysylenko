import { env } from "../config/env.js";
import { AppError } from "../utils/errors.js";
import { metricsService } from "./metrics.service.js";
import { cacheService, CacheService } from "./cache.service.js";
import { logger } from "../utils/logger.js";

const GITHUB_API_BASE_URL = "https://api.github.com";

export type GithubRepoCheck = {
    owner: string;
    repo: string;
    fullName: string;
};

export type LatestRelease = {
    tagName: string;
    htmlUrl: string;
    name: string | null;
    publishedAt: string | null;
};

const BASE_HEADERS: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "github-release-notifier",
    "X-GitHub-Api-Version": "2022-11-28",
};

function buildHeaders(): HeadersInit {
    if (!env.GITHUB_TOKEN) {
        return BASE_HEADERS;
    }

    return {
        ...BASE_HEADERS,
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    };
}

async function fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), env.GITHUB_API_TIMEOUT_MS);

    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
            throw AppError.external("GitHub API request timeout");
        }
        throw error;
    }
}

async function handleGithubErrors(response: Response): Promise<void> {
    if (response.status === 429 || response.status === 403) {
        const remaining = response.headers.get("x-ratelimit-remaining");

        if (response.status === 429 || remaining === "0") {
            throw AppError.rateLimited("GitHub API rate limit exceeded. Please try again later.");
        }
    }
}

export const githubService = {
    async assertRepositoryExists(input: GithubRepoCheck): Promise<void> {
        const cacheKey = CacheService.generateKey("repo_exists", input.owner, input.repo);

        const cached = await cacheService.get<boolean>(cacheKey);
        if (cached === true) {
            logger.debug("Repository existence found in cache", { repo: input.fullName });
            return;
        }

        const response = await fetchWithTimeout(`${GITHUB_API_BASE_URL}/repos/${input.owner}/${input.repo}`, {
            headers: buildHeaders(),
        });

        metricsService.recordGithubApiCall(response.ok ? "success" : "error", "other");

        await handleGithubErrors(response);

        if (response.status === 404) {
            throw AppError.notFound("Repository not found on GitHub");
        }

        if (!response.ok) {
            throw AppError.external("Failed to validate repository via GitHub API");
        }

        await cacheService.set(cacheKey, true);
        logger.debug("Repository existence cached", { repo: input.fullName });
    },

    async getLatestRelease(input: GithubRepoCheck): Promise<LatestRelease | null> {
        const cacheKey = CacheService.generateKey("latest_release", input.owner, input.repo);

        const cached = await cacheService.get<LatestRelease | null>(cacheKey);
        if (cached !== null) {
            logger.debug("Latest release found in cache", { repo: input.fullName, tagName: cached?.tagName });
            return cached;
        }

        const response = await fetchWithTimeout(`${GITHUB_API_BASE_URL}/repos/${input.owner}/${input.repo}/releases/latest`, {
            headers: buildHeaders(),
        });

        metricsService.recordGithubApiCall(response.ok ? "success" : "error", "releases");

        await handleGithubErrors(response);

        if (response.status === 404) {
            await cacheService.set(cacheKey, null, 120);
            logger.debug("No release found - cached null result", { repo: input.fullName });
            return null;
        }

        if (!response.ok) {
            throw AppError.external("Failed to fetch latest release from GitHub API");
        }

        const data = (await response.json()) as {
            tag_name: string;
            html_url: string;
            name: string | null;
            published_at: string | null;
        };

        const result: LatestRelease = {
            tagName: data.tag_name,
            htmlUrl: data.html_url,
            name: data.name,
            publishedAt: data.published_at,
        };

        await cacheService.set(cacheKey, result);
        logger.debug("Latest release cached", { repo: input.fullName, tagName: result.tagName });

        return result;
    },
};
