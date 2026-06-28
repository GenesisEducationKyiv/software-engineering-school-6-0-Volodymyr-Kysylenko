import type { SubscriptionRecord, SubscriptionResponse } from "../../types/subscription.js";

export class SubscriptionResponseMapper {
    toResponse(record: {
        email: string;
        repo_full_name: string;
        confirmed: boolean;
        last_seen_tag: string | null;
    }): SubscriptionResponse {
        return {
            email: record.email,
            repo: record.repo_full_name,
            confirmed: record.confirmed,
            last_seen_tag: record.last_seen_tag,
        };
    }

    toResponseList(records: SubscriptionRecord[]): SubscriptionResponse[] {
        return records.map((record) => this.toResponse(record));
    }
}
