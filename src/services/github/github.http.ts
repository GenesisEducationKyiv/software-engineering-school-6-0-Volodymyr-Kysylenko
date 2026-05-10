import { AppError } from "../../utils/errors.js";
import type { GitHubHttpClientPort } from "./github.types.js";

export class DefaultGitHubHttpClient implements GitHubHttpClientPort {
    constructor(private readonly timeoutMs: number) {}

    async fetchWithTimeout(url: string, options: RequestInit): Promise<Response> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

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
}
