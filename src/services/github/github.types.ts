import type { LoggerPort } from "../../utils/logger/logger.types.js";

export interface GithubRepoCheck {
    owner: string;
    repo: string;
    fullName: string;
}

export interface GithubRelease {
    tagName: string;
    htmlUrl: string;
    name: string | null;
    publishedAt: string | null;
}

export interface GitHubHttpClientPort {
    fetchWithTimeout(url: string, options: RequestInit): Promise<Response>;
}

export interface GitHubCachePort {
    get<T>(key: string): Promise<T | null>;
    getEntry<T>(key: string): Promise<{ hit: true; value: T } | { hit: false; value: null }>;
    set<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
}

export type GitHubLoggerPort = Pick<LoggerPort, "debug">;

export interface GitHubMetricsPort {
    recordGithubApiCall(status: "success" | "error", endpoint: "releases" | "rate_limit" | "other"): void;
}

export interface GitHubServicePort {
    assertRepositoryExists(input: GithubRepoCheck): Promise<void>;
    getLatestRelease(input: GithubRepoCheck): Promise<GithubRelease | null>;
}

export interface GitHubServiceDependencies {
    httpClient: GitHubHttpClientPort;
    cache: GitHubCachePort;
    logger: GitHubLoggerPort;
    metrics: GitHubMetricsPort;
    githubToken?: string;
}
