import { beforeEach, describe, expect, it, vi } from "vitest";

import { GitHubService } from "../services/github/github.service.js";
import type {
    GitHubCachePort,
    GitHubHttpClientPort,
    GitHubLoggerPort,
    GitHubMetricsPort,
    GithubRepoCheck,
    GitHubServiceDependencies,
} from "../services/github/github.types.js";
import { AppError } from "../utils/errors.js";
import { createMockLogger } from "./helpers/mock-logger.js";

describe("GitHubService", () => {
    let service: GitHubService;
    let mockHttpClient: GitHubHttpClientPort;
    let mockCache: GitHubCachePort;
    let mockLogger: GitHubLoggerPort;
    let mockMetrics: GitHubMetricsPort;

    beforeEach(() => {
        mockHttpClient = {
            fetchWithTimeout: vi.fn(),
        };

        mockCache = {
            get: vi.fn(),
            getEntry: vi.fn(),
            set: vi.fn(),
        };

        mockLogger = createMockLogger();

        mockMetrics = {
            recordGithubApiCall: vi.fn(),
        };

        const deps: GitHubServiceDependencies = {
            httpClient: mockHttpClient,
            cache: mockCache,
            logger: mockLogger,
            metrics: mockMetrics,
            githubToken: "test-token",
        };

        service = new GitHubService(deps);
    });

    describe("assertRepositoryExists", () => {
        it("should return immediately if repository exists in cache", async () => {
            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            vi.mocked(mockCache.get).mockResolvedValue(true);

            await service.assertRepositoryExists(input);

            expect(mockCache.get).toHaveBeenCalledWith("repo_exists:microsoft:vscode");
            expect(mockLogger.debug).toHaveBeenCalledWith(
                "Repository existence found in cache",
                expect.objectContaining({ repo: "microsoft/vscode" }),
            );
            expect(mockHttpClient.fetchWithTimeout).not.toHaveBeenCalled();
        });

        it("should fetch repository from API if not in cache", async () => {
            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            vi.mocked(mockCache.get).mockResolvedValue(null);
            const mockResponse = {
                ok: true,
                status: 200,
                headers: new Map(),
            } as unknown as Response;
            vi.mocked(mockHttpClient.fetchWithTimeout).mockResolvedValue(mockResponse);

            await service.assertRepositoryExists(input);

            expect(mockHttpClient.fetchWithTimeout).toHaveBeenCalledWith(
                "https://api.github.com/repos/microsoft/vscode",
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: "Bearer test-token",
                    }),
                }),
            );
            expect(mockMetrics.recordGithubApiCall).toHaveBeenCalledWith("success", "other");
            expect(mockCache.set).toHaveBeenCalledWith("repo_exists:microsoft:vscode", true);
        });

        it("should throw NotFound if repository does not exist on GitHub", async () => {
            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            vi.mocked(mockCache.get).mockResolvedValue(null);
            const mockResponse = {
                ok: false,
                status: 404,
                headers: new Map(),
            } as unknown as Response;
            vi.mocked(mockHttpClient.fetchWithTimeout).mockResolvedValue(mockResponse);

            await expect(service.assertRepositoryExists(input)).rejects.toThrow(
                expect.objectContaining({
                    message: "Repository not found on GitHub",
                }),
            );

            expect(mockMetrics.recordGithubApiCall).toHaveBeenCalledWith("error", "other");
        });

        it("should throw RateLimited if GitHub API rate limit exceeded", async () => {
            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            vi.mocked(mockCache.get).mockResolvedValue(null);
            const headersMap = new Map();
            headersMap.set("x-ratelimit-remaining", "0");
            const mockResponse = {
                ok: false,
                status: 403,
                headers: headersMap,
            } as unknown as Response;
            vi.mocked(mockHttpClient.fetchWithTimeout).mockResolvedValue(mockResponse);

            await expect(service.assertRepositoryExists(input)).rejects.toThrow(
                expect.objectContaining({
                    message: "GitHub API rate limit exceeded. Please try again later.",
                }),
            );

            expect(mockMetrics.recordGithubApiCall).toHaveBeenCalledWith("error", "other");
        });

        it("should throw ExternalError if API call fails", async () => {
            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            vi.mocked(mockCache.get).mockResolvedValue(null);
            const mockResponse = {
                ok: false,
                status: 500,
                headers: new Map(),
            } as unknown as Response;
            vi.mocked(mockHttpClient.fetchWithTimeout).mockResolvedValue(mockResponse);

            await expect(service.assertRepositoryExists(input)).rejects.toThrow(
                expect.objectContaining({
                    message: "Failed to validate repository via GitHub API",
                }),
            );

            expect(mockMetrics.recordGithubApiCall).toHaveBeenCalledWith("error", "other");
        });
    });

    describe("getLatestRelease", () => {
        it("should return cached release if available", async () => {
            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            const cachedRelease = {
                tagName: "v1.84.0",
                htmlUrl: "https://github.com/microsoft/vscode/releases/tag/v1.84.0",
                name: "Release v1.84.0",
                publishedAt: "2023-09-13T00:00:00Z",
            };

            vi.mocked(mockCache.getEntry).mockResolvedValue({ hit: true, value: cachedRelease });

            const result = await service.getLatestRelease(input);

            expect(result).toEqual(cachedRelease);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                "Latest release found in cache",
                expect.objectContaining({
                    repo: "microsoft/vscode",
                    tagName: "v1.84.0",
                }),
            );
            expect(mockHttpClient.fetchWithTimeout).not.toHaveBeenCalled();
        });

        it("should return null from cached negative release result", async () => {
            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            vi.mocked(mockCache.getEntry).mockResolvedValue({ hit: true, value: null });

            const result = await service.getLatestRelease(input);

            expect(result).toBeNull();
            expect(mockLogger.debug).toHaveBeenCalledWith(
                "No release found in cache",
                expect.objectContaining({ repo: "microsoft/vscode" }),
            );
            expect(mockHttpClient.fetchWithTimeout).not.toHaveBeenCalled();
        });

        it("should fetch latest release from API if not in cache", async () => {
            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            vi.mocked(mockCache.getEntry).mockResolvedValue({ hit: false, value: null });
            const mockResponse = {
                ok: true,
                status: 200,
                headers: new Map(),
                json: vi.fn().mockResolvedValue({
                    tag_name: "v1.84.0",
                    html_url: "https://github.com/microsoft/vscode/releases/tag/v1.84.0",
                    name: "Release v1.84.0",
                    published_at: "2023-09-13T00:00:00Z",
                }),
            } as unknown as Response;
            vi.mocked(mockHttpClient.fetchWithTimeout).mockResolvedValue(mockResponse);

            const result = await service.getLatestRelease(input);

            expect(result).toEqual({
                tagName: "v1.84.0",
                htmlUrl: "https://github.com/microsoft/vscode/releases/tag/v1.84.0",
                name: "Release v1.84.0",
                publishedAt: "2023-09-13T00:00:00Z",
            });
            expect(mockHttpClient.fetchWithTimeout).toHaveBeenCalledWith(
                "https://api.github.com/repos/microsoft/vscode/releases/latest",
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: "Bearer test-token",
                    }),
                }),
            );
            expect(mockMetrics.recordGithubApiCall).toHaveBeenCalledWith("success", "releases");
            expect(mockCache.set).toHaveBeenCalledWith(
                "latest_release:microsoft:vscode",
                expect.objectContaining({ tagName: "v1.84.0" }),
            );
        });

        it("should cache null result if repository has no releases", async () => {
            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            vi.mocked(mockCache.getEntry).mockResolvedValue({ hit: false, value: null });
            const mockResponse = {
                ok: false,
                status: 404,
                headers: new Map(),
            } as unknown as Response;
            vi.mocked(mockHttpClient.fetchWithTimeout).mockResolvedValue(mockResponse);

            const result = await service.getLatestRelease(input);

            expect(result).toBeNull();
            expect(mockMetrics.recordGithubApiCall).toHaveBeenCalledWith("error", "releases");
            expect(mockCache.set).toHaveBeenCalledWith("latest_release:microsoft:vscode", null, 120);
            expect(mockLogger.debug).toHaveBeenCalledWith(
                "No release found - cached null result",
                expect.objectContaining({ repo: "microsoft/vscode" }),
            );
        });

        it("should throw RateLimited on 429 status", async () => {
            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            vi.mocked(mockCache.getEntry).mockResolvedValue({ hit: false, value: null });
            const mockResponse = {
                ok: false,
                status: 429,
                headers: new Map(),
            } as unknown as Response;
            vi.mocked(mockHttpClient.fetchWithTimeout).mockResolvedValue(mockResponse);

            await expect(service.getLatestRelease(input)).rejects.toThrow(
                expect.objectContaining({
                    message: "GitHub API rate limit exceeded. Please try again later.",
                }),
            );

            expect(mockMetrics.recordGithubApiCall).toHaveBeenCalledWith("error", "releases");
        });

        it("should throw ExternalError if API call fails", async () => {
            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            vi.mocked(mockCache.getEntry).mockResolvedValue({ hit: false, value: null });
            const mockResponse = {
                ok: false,
                status: 500,
                headers: new Map(),
            } as unknown as Response;
            vi.mocked(mockHttpClient.fetchWithTimeout).mockResolvedValue(mockResponse);

            await expect(service.getLatestRelease(input)).rejects.toThrow(
                expect.objectContaining({
                    message: "Failed to fetch latest release from GitHub API",
                }),
            );

            expect(mockMetrics.recordGithubApiCall).toHaveBeenCalledWith("error", "releases");
        });

        it("should handle null fields in API response", async () => {
            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            vi.mocked(mockCache.getEntry).mockResolvedValue({ hit: false, value: null });
            const mockResponse = {
                ok: true,
                status: 200,
                headers: new Map(),
                json: vi.fn().mockResolvedValue({
                    tag_name: "v1.84.0",
                    html_url: "https://github.com/microsoft/vscode/releases/tag/v1.84.0",
                    name: null,
                    published_at: null,
                }),
            } as unknown as Response;
            vi.mocked(mockHttpClient.fetchWithTimeout).mockResolvedValue(mockResponse);

            const result = await service.getLatestRelease(input);

            expect(result).toEqual({
                tagName: "v1.84.0",
                htmlUrl: "https://github.com/microsoft/vscode/releases/tag/v1.84.0",
                name: null,
                publishedAt: null,
            });
        });
    });

    describe("HTTP client timeout handling", () => {
        it("should propagate timeout error from HTTP client", async () => {
            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            vi.mocked(mockCache.get).mockResolvedValue(null);
            const timeoutError = AppError.external("GitHub API request timeout");
            vi.mocked(mockHttpClient.fetchWithTimeout).mockRejectedValue(timeoutError);

            await expect(service.assertRepositoryExists(input)).rejects.toThrow(timeoutError);
        });
    });

    describe("Authorization header", () => {
        it("should use GitHub token if provided", async () => {
            const deps: GitHubServiceDependencies = {
                httpClient: mockHttpClient,
                cache: mockCache,
                logger: mockLogger,
                metrics: mockMetrics,
                githubToken: "my-secret-token",
            };

            const serviceWithToken = new GitHubService(deps);

            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            vi.mocked(mockCache.get).mockResolvedValue(null);
            const mockResponse = {
                ok: true,
                status: 200,
                headers: new Map(),
            } as unknown as Response;
            vi.mocked(mockHttpClient.fetchWithTimeout).mockResolvedValue(mockResponse);

            await serviceWithToken.assertRepositoryExists(input);

            expect(mockHttpClient.fetchWithTimeout).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: "Bearer my-secret-token",
                    }),
                }),
            );
        });

        it("should not include Authorization header if token not provided", async () => {
            const deps: GitHubServiceDependencies = {
                httpClient: mockHttpClient,
                cache: mockCache,
                logger: mockLogger,
                metrics: mockMetrics,
            };

            const serviceWithoutToken = new GitHubService(deps);

            const input: GithubRepoCheck = {
                owner: "microsoft",
                repo: "vscode",
                fullName: "microsoft/vscode",
            };

            vi.mocked(mockCache.get).mockResolvedValue(null);
            const mockResponse = {
                ok: true,
                status: 200,
                headers: new Map(),
            } as unknown as Response;
            vi.mocked(mockHttpClient.fetchWithTimeout).mockResolvedValue(mockResponse);

            await serviceWithoutToken.assertRepositoryExists(input);

            expect(mockHttpClient.fetchWithTimeout).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.not.objectContaining({
                        Authorization: expect.any(String),
                    }),
                }),
            );
        });
    });
});
