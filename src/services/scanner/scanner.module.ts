import type { EmailServicePort } from "../notification/notification.types.js";
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
    emailService: EmailServicePort;
    githubService: ScannerGithubPort;
    subscriptionRepository: ScannerSubscriptionRepositoryPort;
    metricsService: ScannerMetricsPort;
    lock?: ScannerLockPort;
}

export function createScannerModule(deps: CreateScannerModuleDependencies): ScannerModule {
    return {
        scannerService: new ScannerService({
            emailService: deps.emailService,
            githubService: deps.githubService,
            subscriptionRepository: deps.subscriptionRepository,
            metricsService: deps.metricsService,
            lock: deps.lock ?? new InMemoryScannerLock(),
        }),
    };
}
