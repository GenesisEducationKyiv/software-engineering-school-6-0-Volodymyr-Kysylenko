type EmailSendStatus = "success" | "error";

export interface EmailMessage {
    from: string;
    to: string;
    subject: string;
    text: string;
}

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

export interface ConfirmationLinks {
    confirmApiUrl: string;
    unsubscribeApiUrl: string;
    confirmPageUrl: string;
    unsubscribePageUrl: string;
}

export interface UnsubscribeLinks {
    unsubscribeApiUrl: string;
    unsubscribePageUrl: string;
}

export interface EmailLinkBuilderPort {
    buildConfirmationLinks(confirmToken: string, unsubscribeToken: string): ConfirmationLinks;
    buildUnsubscribeLinks(unsubscribeToken: string): UnsubscribeLinks;
}

export interface EmailTemplatePort {
    buildConfirmationEmail(input: EmailConfirmationInput): EmailMessage;
    buildNewReleaseEmail(input: EmailNewReleaseInput): EmailMessage;
}

export interface EmailServicePort {
    sendConfirmationEmail(input: EmailConfirmationInput): Promise<void>;
    sendNewReleaseEmail(input: EmailNewReleaseInput): Promise<void>;
}

export interface EmailClient {
    verifyConnection(): Promise<void>;
    send(message: EmailMessage): Promise<void>;
}

export interface EmailMetrics {
    recordEmailSent(status: EmailSendStatus): void;
}
