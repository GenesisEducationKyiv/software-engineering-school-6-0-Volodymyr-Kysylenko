import { describe, expect, it } from "vitest";

import { groupSubscriptionsByRepo, shouldNotifyForTag } from "../services/scanner/scanner.logic.js";
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

describe("scanner logic", () => {
    it("returns true when tag changed", () => {
        expect(shouldNotifyForTag(makeSubscription(), "v1.1.0")).toBe(true);
    });

    it("returns false when tag is the same", () => {
        expect(shouldNotifyForTag(makeSubscription(), "v1.0.0")).toBe(false);
    });

    it("returns true when last_seen_tag is null and release appears", () => {
        expect(shouldNotifyForTag(makeSubscription({ last_seen_tag: null }), "v1.0.0")).toBe(true);
    });

    it("groups subscriptions by repository", () => {
        const grouped = groupSubscriptionsByRepo([
            makeSubscription({ id: "1", repo_full_name: "golang/go" }),
            makeSubscription({ id: "2", repo_full_name: "golang/go" }),
            makeSubscription({ id: "3", repo_full_name: "nodejs/node", repo_owner: "nodejs", repo_name: "node" }),
        ]);

        expect(grouped.get("golang/go")).toHaveLength(2);
        expect(grouped.get("nodejs/node")).toHaveLength(1);
    });
});
