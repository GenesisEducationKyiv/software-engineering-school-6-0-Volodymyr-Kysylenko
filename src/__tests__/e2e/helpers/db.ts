import { pool } from "../../../db/pool.js";
import { subscriptionRepository } from "../../../repositories/subscription.repository.js";
import type { SubscriptionRecord } from "../../../types/subscription.js";
import { generateToken } from "../../../utils/crypto.js";
import { parseRepo } from "../../../utils/validators.js";

export async function createSubscription(input: {
    email: string;
    repo: string;
    confirmed?: boolean;
    unsubscribed?: boolean;
    lastSeenTag?: string | null;
}): Promise<SubscriptionRecord> {
    const parsedRepo = parseRepo(input.repo);

    const created = await subscriptionRepository.create({
        email: input.email,
        repoOwner: parsedRepo.owner,
        repoName: parsedRepo.repo,
        repoFullName: parsedRepo.fullName,
        confirmToken: generateToken(),
        unsubscribeToken: generateToken(),
        lastSeenTag: input.lastSeenTag ?? null,
    });

    // E2E fixtures sometimes need state variants that are not part of regular create().
    if (!input.confirmed && !input.unsubscribed) {
        return created;
    }

    const { rows } = await pool.query<SubscriptionRecord>(
        `
        UPDATE subscriptions
        SET confirmed = $2,
            confirmed_at = CASE WHEN $2 THEN COALESCE(confirmed_at, NOW()) ELSE NULL END,
            unsubscribed_at = CASE WHEN $3 THEN COALESCE(unsubscribed_at, NOW()) ELSE NULL END
        WHERE id = $1
        RETURNING *
        `,
        [created.id, input.confirmed ?? false, input.unsubscribed ?? false],
    );

    return rows[0] ?? created;
}
