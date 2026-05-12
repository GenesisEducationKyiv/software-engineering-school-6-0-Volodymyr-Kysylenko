import { AppError } from "../../utils/errors.js";
import type { GitHubFetchPort, GitHubHttpClientPort } from "./github.types.js";

export class DefaultGitHubHttpClient implements GitHubHttpClientPort {
    constructor(
        private readonly timeoutMs: number,
        private readonly fetchFn: GitHubFetchPort,
    ) {}

    async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

        try {
            return await this.fetchFn(url, {
                ...options,
                signal: controller.signal,
            });
        } catch (error) {
            if (error instanceof Error && error.name === "AbortError") {
                throw AppError.external("GitHub API request timeout");
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }
}
