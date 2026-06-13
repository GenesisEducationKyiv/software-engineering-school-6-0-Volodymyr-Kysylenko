import type { LoggerPort } from "../../utils/logger/logger.types.js";

type EmailSendStatus = "success" | "error";

export type EmailRetryLoggerPort = Pick<LoggerPort, "warn">;

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
    appBaseUrl: string;
}

export interface EmailNewReleaseInput {
    to: string;
    repo: string;
    releaseName: string | null;
    tagName: string;
    releaseUrl: string;
    unsubscribeToken: string;
    appBaseUrl: string;
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
    buildConfirmationLinks(confirmToken: string, unsubscribeToken: string, appBaseUrl: string): ConfirmationLinks;
    buildUnsubscribeLinks(unsubscribeToken: string, appBaseUrl: string): UnsubscribeLinks;
}

export interface EmailTemplatePort {
    buildConfirmationEmail(input: EmailConfirmationInput): EmailMessage;
    buildNewReleaseEmail(input: EmailNewReleaseInput): EmailMessage;
}

export interface EmailServicePort {
    verifyConnection(): Promise<void>;
    sendConfirmationEmail(input: EmailConfirmationInput): Promise<void>;
    sendNewReleaseEmail(input: EmailNewReleaseInput): Promise<void>;
    close(): Promise<void>;
}

export interface EmailClient {
    verifyConnection(): Promise<void>;
    send(message: EmailMessage): Promise<void>;
    close(): Promise<void>;
}

export interface EmailMetrics {
    recordEmailSent(status: EmailSendStatus): void;
    recordEmailDuration(type: "confirmation" | "release", durationSeconds: number): void;
}
