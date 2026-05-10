import { describe, expect, it, vi } from "vitest";

import { ScannerService } from "../services/scanner/scanner.service.js";
import type { ScannerServiceDependencies } from "../services/scanner/scanner.types.js";
import type { SubscriptionRecord } from "../types/subscription.js";

function makeSubscription(overrides: Partial<SubscriptionRecord> = {}): SubscriptionRecord {
    return {
        id: "1",
        email: "user@example.com",
        repo_owner: "golang",
        repo_name: "go",
        repo_full_name: "golang/go",
        confirmed: true,
        confirm_token: "confirm",
        unsubscribe_token: "unsubscribe",
        last_seen_tag: "v1.0.0",
        created_at: new Date(),
        confirmed_at: new Date(),
        unsubscribed_at: null,
        ...overrides,
    };
}

function createDeps(overrides: Partial<ScannerServiceDependencies> = {}): ScannerServiceDependencies {
    return {
        emailService: {
            sendConfirmationEmail: vi.fn(),
            sendNewReleaseEmail: vi.fn().mockResolvedValue(undefined),
        },
        lock: {
            acquire: vi.fn().mockReturnValue(true),
            release: vi.fn(),
        },
        subscriptionRepository: {
            listConfirmedActive: vi.fn().mockResolvedValue([]),
            countActiveSubscriptions: vi.fn().mockResolvedValue(0),
            updateLastSeenTagByRepo: vi.fn().mockResolvedValue(undefined),
        },
        githubService: {
            getLatestRelease: vi.fn().mockResolvedValue(null),
        },
        metricsService: {
            updateActiveSubscriptions: vi.fn(),
            recordScannerRun: vi.fn(),
        },
        ...overrides,
    };
}

describe("scanner service", () => {
    it("does nothing when lock is already acquired", async () => {
        const deps = createDeps({
            lock: {
                acquire: vi.fn().mockReturnValue(false),
                release: vi.fn(),
            },
        });

        const service = new ScannerService(deps);

        await service.scanOnce();

        expect(deps.subscriptionRepository.listConfirmedActive).not.toHaveBeenCalled();
        expect(deps.lock.release).not.toHaveBeenCalled();
        expect(deps.metricsService.recordScannerRun).not.toHaveBeenCalled();
    });

    it("sends notifications only for stale subscriptions and updates last seen tag", async () => {
        const deps = createDeps({
            subscriptionRepository: {
                listConfirmedActive: vi
                    .fn()
                    .mockResolvedValue([
                        makeSubscription({ id: "1", email: "a@example.com", last_seen_tag: "v1.0.0" }),
                        makeSubscription({ id: "2", email: "b@example.com", last_seen_tag: "v2.0.0" }),
                    ]),
                countActiveSubscriptions: vi.fn().mockResolvedValue(2),
                updateLastSeenTagByRepo: vi.fn().mockResolvedValue(undefined),
            },
            githubService: {
                getLatestRelease: vi.fn().mockResolvedValue({
                    tagName: "v2.0.0",
                    htmlUrl: "https://github.com/golang/go/releases/tag/v2.0.0",
                    name: "v2",
                }),
            },
        });

        const service = new ScannerService(deps);

        await service.scanOnce();

        expect(deps.subscriptionRepository.countActiveSubscriptions).toHaveBeenCalledTimes(1);
        expect(deps.metricsService.updateActiveSubscriptions).toHaveBeenCalledWith(2);
        expect(deps.emailService.sendNewReleaseEmail).toHaveBeenCalledTimes(1);
        expect(deps.emailService.sendNewReleaseEmail).toHaveBeenCalledWith(
            expect.objectContaining({
                to: "a@example.com",
                tagName: "v2.0.0",
                repo: "golang/go",
            }),
        );
        expect(deps.subscriptionRepository.updateLastSeenTagByRepo).toHaveBeenCalledWith("golang/go", "v2.0.0");
        expect(deps.metricsService.recordScannerRun).toHaveBeenCalledWith("success");
        expect(deps.lock.release).toHaveBeenCalledTimes(1);
    });

    it("records error metric and rethrows on failure", async () => {
        const scanError = new Error("GitHub down");

        const deps = createDeps({
            subscriptionRepository: {
                listConfirmedActive: vi.fn().mockResolvedValue([makeSubscription()]),
                countActiveSubscriptions: vi.fn().mockResolvedValue(1),
                updateLastSeenTagByRepo: vi.fn().mockResolvedValue(undefined),
            },
            githubService: {
                getLatestRelease: vi.fn().mockRejectedValue(scanError),
            },
        });

        const service = new ScannerService(deps);

        await expect(service.scanOnce()).rejects.toThrow("GitHub down");

        expect(deps.metricsService.recordScannerRun).toHaveBeenCalledWith("error");
        expect(deps.lock.release).toHaveBeenCalledTimes(1);
    });
});
