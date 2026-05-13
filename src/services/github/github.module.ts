import { metricsService } from "../metrics/metrics.service.js";
import { GitHubService } from "./github.service.js";
import type { GitHubServiceDependencies, GitHubServicePort } from "./github.types.js";

export type CreateGithubModuleDependencies = GitHubServiceDependencies;

export interface GithubModule {
    githubService: GitHubServicePort;
}

export function createGithubModule(deps: CreateGithubModuleDependencies): GithubModule {
    return {
        githubService: new GitHubService({ ...deps, metrics: metricsService }),
    };
}
