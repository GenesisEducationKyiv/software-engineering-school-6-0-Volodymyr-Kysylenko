import type { PoolClient } from "pg";

import type { TransactionRunner } from "../../db/transaction.js";
import type { SubscriptionRecord } from "../../types/subscription.js";
import type { NotificationCommandPublisherPort } from "../notification/notification.types.js";

export interface ScannerLockPort {
    acquire(): boolean;
    release(): void;
}

export interface ScannerSubscriptionRepositoryPort {
    listConfirmedActive(): Promise<SubscriptionRecord[]>;
    countActiveSubscriptions(): Promise<number>;
    updateLastSeenTagByRepo(client: PoolClient, repoFullName: string, tag: string): Promise<void>;
}

export interface ScannerRelease {
    tagName: string;
    htmlUrl: string;
    name: string | null;
}

export interface ScannerGithubPort {
    getLatestRelease(input: { owner: string; repo: string; fullName: string }): Promise<ScannerRelease | null>;
}

export interface ScannerMetricsPort {
    updateActiveSubscriptions(count: number): void;
    recordScannerRun(status: "success" | "error"): void;
    recordScannerRunDuration(durationSeconds: number): void;
}

export interface ScannerServiceDependencies {
    notificationPublisher: NotificationCommandPublisherPort;
    subscriptionRepository: ScannerSubscriptionRepositoryPort;
    githubService: ScannerGithubPort;
    metricsService: ScannerMetricsPort;
    lock: ScannerLockPort;
    transactionRunner: TransactionRunner;
}
