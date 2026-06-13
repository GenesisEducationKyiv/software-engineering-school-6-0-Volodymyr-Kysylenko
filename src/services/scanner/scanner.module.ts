import type { TransactionRunner } from "../../db/transaction.js";
import type { NotificationCommandPublisherPort } from "../notification/notification.types.js";
import { InMemoryScannerLock } from "./scanner.lock.js";
import { ScannerService } from "./scanner.service.js";
import type {
    ScannerGithubPort,
    ScannerLockPort,
    ScannerMetricsPort,
    ScannerSubscriptionRepositoryPort,
} from "./scanner.types.js";

export interface ScannerModule {
    scannerService: ScannerService;
}

export interface CreateScannerModuleDependencies {
    notificationPublisher: NotificationCommandPublisherPort;
    githubService: ScannerGithubPort;
    subscriptionRepository: ScannerSubscriptionRepositoryPort;
    metricsService: ScannerMetricsPort;
    transactionRunner: TransactionRunner;
    lock?: ScannerLockPort;
}

export function createScannerModule(deps: CreateScannerModuleDependencies): ScannerModule {
    return {
        scannerService: new ScannerService({
            notificationPublisher: deps.notificationPublisher,
            githubService: deps.githubService,
            subscriptionRepository: deps.subscriptionRepository,
            metricsService: deps.metricsService,
            transactionRunner: deps.transactionRunner,
            lock: deps.lock ?? new InMemoryScannerLock(),
        }),
    };
}
