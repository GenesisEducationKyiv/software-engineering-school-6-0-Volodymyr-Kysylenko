export interface SubscriptionRecord {
    id: string;
    email: string;
    repo_owner: string;
    repo_name: string;
    repo_full_name: string;
    confirmed: boolean;
    confirm_token: string;
    unsubscribe_token: string;
    last_seen_tag: string | null;
    created_at: Date;
    confirmed_at: Date | null;
    unsubscribed_at: Date | null;
}

export interface SubscriptionResponse {
    email: string;
    repo: string;
    confirmed: boolean;
    last_seen_tag: string | null;
}
