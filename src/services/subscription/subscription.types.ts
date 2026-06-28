import type { PoolClient } from "pg";

import type { TransactionRunner } from "../../db/transaction.js";
import type { SubscriptionRecord, SubscriptionResponse } from "../../types/subscription.js";
import type { LoggerPort } from "../../utils/logger/logger.types.js";
import type { GitHubServicePort } from "../github/github.types.js";
import type { NotificationCommandPublisherPort } from "../notification/notification.types.js";

export interface SubscriptionRepositoryPort {
    create(
        client: PoolClient,
        input: {
            email: string;
            repoOwner: string;
            repoName: string;
            repoFullName: string;
            confirmToken: string;
            unsubscribeToken: string;
            lastSeenTag: string | null;
        },
    ): Promise<SubscriptionRecord>;

    reactivate(
        client: PoolClient,
        input: {
            id: string;
            confirmToken: string;
            unsubscribeToken: string;
            lastSeenTag: string | null;
        },
    ): Promise<SubscriptionRecord>;

    findByEmailAndRepo(email: string, repoFullName: string): Promise<SubscriptionRecord | null>;
    findByEmailAndRepoForUpdate(
        client: PoolClient,
        email: string,
        repoFullName: string,
    ): Promise<SubscriptionRecord | null>;
    findByConfirmToken(token: string): Promise<SubscriptionRecord | null>;
    findByUnsubscribeToken(token: string): Promise<SubscriptionRecord | null>;
    confirmById(id: string): Promise<void>;
    unsubscribeById(id: string): Promise<void>;
    listActiveByEmail(email: string): Promise<SubscriptionRecord[]>;
}

export interface SubscriptionServicePort {
    subscribe(input: { email: string; repo: string }): Promise<void>;
    confirm(token: string): Promise<void>;
    unsubscribe(token: string): Promise<void>;
    listByEmail(emailInput: string): Promise<SubscriptionResponse[]>;
}

export interface SubscriptionTokenValidatorPort {
    validate(token: string): void;
}

export interface SubscriptionResponseMapperPort {
    toResponse(record: {
        email: string;
        repo_full_name: string;
        confirmed: boolean;
        last_seen_tag: string | null;
    }): SubscriptionResponse;
    toResponseList(records: SubscriptionRecord[]): SubscriptionResponse[];
}

export interface SubscriptionServiceDependencies {
    notificationPublisher: NotificationCommandPublisherPort;
    githubService: GitHubServicePort;
    subscriptionRepository: SubscriptionRepositoryPort;
    tokenValidator: SubscriptionTokenValidatorPort;
    responseMapper: SubscriptionResponseMapperPort;
    logger: LoggerPort;
    transactionRunner: TransactionRunner;
}
