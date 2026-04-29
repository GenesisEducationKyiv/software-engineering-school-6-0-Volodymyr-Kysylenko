import { pool } from "../db/pool.js";
import type { SubscriptionRecord } from "../types/subscription.js";

export class SubscriptionRepository {
    private mapRow(row: Record<string, unknown>): SubscriptionRecord {
        return row as unknown as SubscriptionRecord;
    }

    async create(input: {
        email: string;
        repoOwner: string;
        repoName: string;
        repoFullName: string;
        confirmToken: string;
        unsubscribeToken: string;
        lastSeenTag: string | null;
    }): Promise<SubscriptionRecord> {
        const result = await pool.query(
            `
        INSERT INTO subscriptions (
          email, repo_owner, repo_name, repo_full_name, confirm_token, unsubscribe_token, last_seen_tag
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
            [
                input.email,
                input.repoOwner,
                input.repoName,
                input.repoFullName,
                input.confirmToken,
                input.unsubscribeToken,
                input.lastSeenTag,
            ],
        );

        return this.mapRow(result.rows[0]);
    }

    async reactivate(input: {
        id: string;
        confirmToken: string;
        unsubscribeToken: string;
        lastSeenTag: string | null;
    }): Promise<SubscriptionRecord> {
        const result = await pool.query(
            `
        UPDATE subscriptions
        SET confirmed = FALSE,
            confirm_token = $2,
            unsubscribe_token = $3,
            last_seen_tag = $4,
            confirmed_at = NULL,
            unsubscribed_at = NULL
        WHERE id = $1
        RETURNING *
      `,
            [input.id, input.confirmToken, input.unsubscribeToken, input.lastSeenTag],
        );

        return this.mapRow(result.rows[0]);
    }

    async findByEmailAndRepo(email: string, repoFullName: string): Promise<SubscriptionRecord | null> {
        const result = await pool.query(`SELECT * FROM subscriptions WHERE email = $1 AND repo_full_name = $2 LIMIT 1`, [
            email,
            repoFullName,
        ]);

        return result.rows[0] ? this.mapRow(result.rows[0]) : null;
    }

    async findByConfirmToken(token: string): Promise<SubscriptionRecord | null> {
        const result = await pool.query(`SELECT * FROM subscriptions WHERE confirm_token = $1 LIMIT 1`, [token]);
        return result.rows[0] ? this.mapRow(result.rows[0]) : null;
    }

    async findByUnsubscribeToken(token: string): Promise<SubscriptionRecord | null> {
        const result = await pool.query(`SELECT * FROM subscriptions WHERE unsubscribe_token = $1 LIMIT 1`, [token]);
        return result.rows[0] ? this.mapRow(result.rows[0]) : null;
    }

    async confirmById(id: string): Promise<void> {
        await pool.query(
            `
        UPDATE subscriptions
        SET confirmed = TRUE,
            confirmed_at = COALESCE(confirmed_at, NOW())
        WHERE id = $1
      `,
            [id],
        );
    }

    async unsubscribeById(id: string): Promise<void> {
        await pool.query(
            `
        UPDATE subscriptions
        SET unsubscribed_at = COALESCE(unsubscribed_at, NOW())
        WHERE id = $1
      `,
            [id],
        );
    }

    async listActiveByEmail(email: string): Promise<SubscriptionRecord[]> {
        const result = await pool.query(
            `
        SELECT *
        FROM subscriptions
        WHERE email = $1 AND unsubscribed_at IS NULL
        ORDER BY created_at DESC
      `,
            [email],
        );

        return result.rows.map((row) => this.mapRow(row));
    }

    async listConfirmedActive(): Promise<SubscriptionRecord[]> {
        const result = await pool.query(
            `
        SELECT *
        FROM subscriptions
        WHERE confirmed = TRUE AND unsubscribed_at IS NULL
        ORDER BY repo_full_name, created_at ASC
      `,
        );

        return result.rows.map((row) => this.mapRow(row));
    }

    async updateLastSeenTagByRepo(repoFullName: string, tag: string): Promise<void> {
        await pool.query(
            `
        UPDATE subscriptions
        SET last_seen_tag = $2
        WHERE repo_full_name = $1
          AND confirmed = TRUE
          AND unsubscribed_at IS NULL
      `,
            [repoFullName, tag],
        );
    }

    async countActiveSubscriptions(): Promise<number> {
        const result = await pool.query(
            `
        SELECT COUNT(*) as count
        FROM subscriptions
        WHERE confirmed = TRUE AND unsubscribed_at IS NULL
      `,
        );

        return parseInt(result.rows[0].count, 10);
    }
}

export const subscriptionRepository = new SubscriptionRepository();
