import type { SubscriptionRecord } from "../../types/subscription.js";
import { elapsedSeconds } from "../../utils/hrtime.js";
import { groupSubscriptionsByRepo, shouldNotifyForTag } from "./scanner.logic.js";
import type { ScannerServiceDependencies } from "./scanner.types.js";

export class ScannerService {
    constructor(private readonly deps: ScannerServiceDependencies) {}

    async scanOnce(): Promise<void> {
        const acquired = this.deps.lock.acquire();

        if (!acquired) {
            return;
        }

        const t0 = process.hrtime.bigint();
        try {
            const subscriptions = await this.deps.subscriptionRepository.listConfirmedActive();

            await this.updateActiveSubscriptionsMetric();

            const repoMap = groupSubscriptionsByRepo(subscriptions);

            for (const [repoFullName, repoSubscriptions] of repoMap.entries()) {
                await this.processRepoSubscriptions(repoFullName, repoSubscriptions);
            }

            this.deps.metricsService.recordScannerRun("success");
        } catch (error) {
            this.deps.metricsService.recordScannerRun("error");
            throw error;
        } finally {
            this.deps.metricsService.recordScannerRunDuration(elapsedSeconds(t0));
            this.deps.lock.release();
        }
    }

    private async updateActiveSubscriptionsMetric(): Promise<void> {
        const activeCount = await this.deps.subscriptionRepository.countActiveSubscriptions();
        this.deps.metricsService.updateActiveSubscriptions(activeCount);
    }

    private async processRepoSubscriptions(
        repoFullName: string,
        repoSubscriptions: SubscriptionRecord[],
    ): Promise<void> {
        const first = repoSubscriptions[0];

        const latestRelease = await this.deps.githubService.getLatestRelease({
            owner: first.repo_owner,
            repo: first.repo_name,
            fullName: repoFullName,
        });

        if (!latestRelease?.tagName) {
            return;
        }

        const staleSubscriptions = repoSubscriptions.filter((item) => shouldNotifyForTag(item, latestRelease.tagName));

        if (staleSubscriptions.length === 0) {
            return;
        }

        for (const subscription of staleSubscriptions) {
            await this.deps.emailService.sendNewReleaseEmail({
                to: subscription.email,
                repo: subscription.repo_full_name,
                releaseName: latestRelease.name,
                tagName: latestRelease.tagName,
                releaseUrl: latestRelease.htmlUrl,
                unsubscribeToken: subscription.unsubscribe_token,
            });
        }

        await this.deps.subscriptionRepository.updateLastSeenTagByRepo(repoFullName, latestRelease.tagName);
    }
}
