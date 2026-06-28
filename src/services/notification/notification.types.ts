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

export interface EmailServicePort {
    verifyConnection(): Promise<void>;
    sendConfirmationEmail(input: EmailConfirmationInput): Promise<void>;
    sendNewReleaseEmail(input: EmailNewReleaseInput): Promise<void>;
}
