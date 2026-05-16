import { subscriptionRepository } from "../../repositories/subscription.repository.js";
import { emailService } from "../email/email.service.js";
import { githubService } from "../github/github.service.js";
import { metricsService } from "../metrics/metrics.service.js";
import { groupSubscriptionsByRepo, shouldNotifyForTag } from "./scanner.logic.js";

class ScannerLock {
    private isLocked = false;

    acquire(): boolean {
        if (this.isLocked) {
            return false;
        }

        this.isLocked = true;
        return true;
    }

    release(): void {
        this.isLocked = false;
    }
}

const scannerLock = new ScannerLock();

export const scannerService = {
    async scanOnce(): Promise<void> {
        const acquired = scannerLock.acquire();

        if (!acquired) {
            return;
        }

        try {
            const subscriptions = await subscriptionRepository.listConfirmedActive();

            const activeCount = await subscriptionRepository.countActiveSubscriptions();
            metricsService.updateActiveSubscriptions(activeCount);

            const repoMap = groupSubscriptionsByRepo(subscriptions);

            for (const [repoFullName, repoSubscriptions] of repoMap.entries()) {
                const first = repoSubscriptions[0];

                const latestRelease = await githubService.getLatestRelease({
                    owner: first.repo_owner,
                    repo: first.repo_name,
                    fullName: repoFullName,
                });

                if (!latestRelease?.tagName) {
                    continue;
                }

                const hasAnyStale = repoSubscriptions.some((item) => shouldNotifyForTag(item, latestRelease.tagName));

                if (!hasAnyStale) {
                    continue;
                }

                for (const subscription of repoSubscriptions) {
                    if (!shouldNotifyForTag(subscription, latestRelease.tagName)) {
                        continue;
                    }

                    await emailService.sendNewReleaseEmail({
                        to: subscription.email,
                        repo: subscription.repo_full_name,
                        releaseName: latestRelease.name,
                        tagName: latestRelease.tagName,
                        releaseUrl: latestRelease.htmlUrl,
                        unsubscribeToken: subscription.unsubscribe_token,
                    });
                }

                await subscriptionRepository.updateLastSeenTagByRepo(repoFullName, latestRelease.tagName);
            }

            metricsService.recordScannerRun("success");
        } catch (error) {
            metricsService.recordScannerRun("error");
            throw error;
        } finally {
            scannerLock.release();
        }
    },
};
