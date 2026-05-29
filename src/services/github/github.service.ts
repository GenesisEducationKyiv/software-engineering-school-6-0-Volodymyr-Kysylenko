import { AppError } from "../../utils/errors.js";
import { elapsedSeconds } from "../../utils/hrtime.js";
import { buildCacheKey } from "../cache/cache.keys.js";
import type { GithubRelease, GithubRepoCheck, GitHubServiceDependencies, GitHubServicePort } from "./github.types.js";

const GITHUB_API_BASE_URL = "https://api.github.com";

const BASE_HEADERS: HeadersInit = {
    Accept: "application/vnd.github+json",
    "User-Agent": "github-release-notifier",
    "X-GitHub-Api-Version": "2022-11-28",
};

export class GitHubService implements GitHubServicePort {
    constructor(private readonly deps: GitHubServiceDependencies) {}

    private buildHeaders(): HeadersInit {
        if (!this.deps.githubToken) {
            return BASE_HEADERS;
        }

        return {
            ...BASE_HEADERS,
            Authorization: `Bearer ${this.deps.githubToken}`,
        };
    }

    private handleGithubErrors(response: Response): void {
        if (response.status === 429 || response.status === 403) {
            const remaining = response.headers.get("x-ratelimit-remaining");

            if (response.status === 429 || remaining === "0") {
                throw AppError.rateLimited("GitHub API rate limit exceeded. Please try again later.");
            }
        }
    }

    async assertRepositoryExists(input: GithubRepoCheck): Promise<void> {
        const cacheKey = buildCacheKey("repo_exists", input.owner, input.repo);

        const cached = await this.deps.cache.get<boolean>(cacheKey);
        if (cached === true) {
            this.deps.logger.debug("Repository existence found in cache", { repo: input.fullName });
            return;
        }

        const t0 = process.hrtime.bigint();
        let response!: Response;
        try {
            response = await this.deps.httpClient.fetchWithTimeout(
                `${GITHUB_API_BASE_URL}/repos/${input.owner}/${input.repo}`,
                { headers: this.buildHeaders() },
            );
        } finally {
            this.deps.metrics.recordGithubApiDuration("other", elapsedSeconds(t0));
        }

        this.deps.metrics.recordGithubApiCall(response.ok ? "success" : "error", "other");

        this.handleGithubErrors(response);

        if (response.status === 404) {
            throw AppError.notFound("Repository not found on GitHub");
        }

        if (!response.ok) {
            throw AppError.external("Failed to validate repository via GitHub API");
        }

        await this.deps.cache.set(cacheKey, true);
        this.deps.logger.debug("Repository existence cached", { repo: input.fullName });
    }

    async getLatestRelease(input: GithubRepoCheck): Promise<GithubRelease | null> {
        const cacheKey = buildCacheKey("latest_release", input.owner, input.repo);

        const cached = await this.deps.cache.getEntry<GithubRelease | null>(cacheKey);
        if (cached.hit) {
            if (cached.value === null) {
                this.deps.logger.debug("No release found in cache", {
                    repo: input.fullName,
                });
                return null;
            }

            this.deps.logger.debug("Latest release found in cache", {
                repo: input.fullName,
                tagName: cached.value.tagName,
            });
            return cached.value;
        }

        const t0 = process.hrtime.bigint();
        let response!: Response;
        try {
            response = await this.deps.httpClient.fetchWithTimeout(
                `${GITHUB_API_BASE_URL}/repos/${input.owner}/${input.repo}/releases/latest`,
                { headers: this.buildHeaders() },
            );
        } finally {
            this.deps.metrics.recordGithubApiDuration("releases", elapsedSeconds(t0));
        }

        this.deps.metrics.recordGithubApiCall(response.ok ? "success" : "error", "releases");

        this.handleGithubErrors(response);

        if (response.status === 404) {
            await this.deps.cache.set(cacheKey, null, 120);
            this.deps.logger.debug("No release found - cached null result", { repo: input.fullName });
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

        const result: GithubRelease = {
            tagName: data.tag_name,
            htmlUrl: data.html_url,
            name: data.name,
            publishedAt: data.published_at,
        };

        await this.deps.cache.set(cacheKey, result);
        this.deps.logger.debug("Latest release cached", { repo: input.fullName, tagName: result.tagName });

        return result;
    }
}
