import type { TransactionRunner } from "../../db/transaction.js";
import type { LoggerPort } from "../../utils/logger/logger.types.js";
import type { GitHubServicePort } from "../github/github.types.js";
import type { NotificationCommandPublisherPort } from "../notification/notification.types.js";
import { SubscriptionResponseMapper } from "./subscription.response-mapper.js";
import { SubscriptionService } from "./subscription.service.js";
import { SubscriptionTokenValidator } from "./subscription.token-validator.js";
import type { SubscriptionRepositoryPort, SubscriptionServicePort } from "./subscription.types.js";

export interface CreateSubscriptionModuleDependencies {
    notificationPublisher: NotificationCommandPublisherPort;
    githubService: GitHubServicePort;
    subscriptionRepository: SubscriptionRepositoryPort;
    logger: LoggerPort;
    transactionRunner: TransactionRunner;
}

export interface SubscriptionModule {
    subscriptionService: SubscriptionServicePort;
}

export function createSubscriptionModule(deps: CreateSubscriptionModuleDependencies): SubscriptionModule {
    const tokenValidator = new SubscriptionTokenValidator();
    const responseMapper = new SubscriptionResponseMapper();

    return {
        subscriptionService: new SubscriptionService({
            notificationPublisher: deps.notificationPublisher,
            githubService: deps.githubService,
            subscriptionRepository: deps.subscriptionRepository,
            tokenValidator,
            responseMapper,
            logger: deps.logger,
            transactionRunner: deps.transactionRunner,
        }),
    };
}
