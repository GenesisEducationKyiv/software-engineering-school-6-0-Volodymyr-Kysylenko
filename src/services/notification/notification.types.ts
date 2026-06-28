import type { PoolClient } from "pg";

export interface EmailConfirmationInput {
    to: string;
    repo: string;
    confirmToken: string;
    unsubscribeToken: string;
}

export interface EmailNewReleaseInput {
    to: string;
    repo: string;
    releaseName: string | null;
    tagName: string;
    releaseUrl: string;
    unsubscribeToken: string;
}

export interface NotificationCommandPublisherPort {
    sendConfirmationEmail(client: PoolClient, input: EmailConfirmationInput): Promise<void>;
    sendNewReleaseEmail(client: PoolClient, input: EmailNewReleaseInput): Promise<void>;
}
