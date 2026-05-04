import type { SubscriptionRecord } from "../types/subscription.js";

export function shouldNotifyForTag(
    subscription: Pick<SubscriptionRecord, "last_seen_tag">,
    latestTag: string,
): boolean {
    return subscription.last_seen_tag !== latestTag;
}

export function groupSubscriptionsByRepo(subscriptions: SubscriptionRecord[]): Map<string, SubscriptionRecord[]> {
    const repoMap = new Map<string, SubscriptionRecord[]>();

    for (const subscription of subscriptions) {
        const bucket = repoMap.get(subscription.repo_full_name) ?? [];
        bucket.push(subscription);
        repoMap.set(subscription.repo_full_name, bucket);
    }

    return repoMap;
}
