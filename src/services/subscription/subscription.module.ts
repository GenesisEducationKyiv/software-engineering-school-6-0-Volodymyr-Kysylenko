import type { LoggerPort } from "../../utils/logger/logger.types.js";
import type { GitHubServicePort } from "../github/github.types.js";
import type { EmailServicePort } from "../notification/notification.types.js";
import { SubscriptionResponseMapper } from "./subscription.response-mapper.js";
import { SubscriptionService } from "./subscription.service.js";
import { SubscriptionTokenValidator } from "./subscription.token-validator.js";
import type { SubscriptionRepositoryPort, SubscriptionServicePort } from "./subscription.types.js";

export interface CreateSubscriptionModuleDependencies {
    emailService: EmailServicePort;
    githubService: GitHubServicePort;
    subscriptionRepository: SubscriptionRepositoryPort;
    logger: LoggerPort;
}

export interface SubscriptionModule {
    subscriptionService: SubscriptionServicePort;
}

export function createSubscriptionModule(deps: CreateSubscriptionModuleDependencies): SubscriptionModule {
    const tokenValidator = new SubscriptionTokenValidator();
    const responseMapper = new SubscriptionResponseMapper();

    return {
        subscriptionService: new SubscriptionService({
            emailService: deps.emailService,
            githubService: deps.githubService,
            subscriptionRepository: deps.subscriptionRepository,
            tokenValidator,
            responseMapper,
            logger: deps.logger,
        }),
    };
}
