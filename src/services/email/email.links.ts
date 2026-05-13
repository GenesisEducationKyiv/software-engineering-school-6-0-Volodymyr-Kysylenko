import type { ConfirmationLinks, EmailLinkBuilderPort, UnsubscribeLinks } from "./email.types.js";

export interface EmailLinkBuilderConfig {
    appBaseUrl: string;
}

export class AppEmailLinkBuilder implements EmailLinkBuilderPort {
    constructor(private readonly config: EmailLinkBuilderConfig) {}

    buildConfirmationLinks(confirmToken: string, unsubscribeToken: string): ConfirmationLinks {
        return {
            confirmApiUrl: `${this.config.appBaseUrl}/api/confirm/${confirmToken}`,
            unsubscribeApiUrl: `${this.config.appBaseUrl}/api/unsubscribe/${unsubscribeToken}`,
            confirmPageUrl: `${this.config.appBaseUrl}/confirm/${confirmToken}`,
            unsubscribePageUrl: `${this.config.appBaseUrl}/unsubscribe/${unsubscribeToken}`,
        };
    }

    buildUnsubscribeLinks(unsubscribeToken: string): UnsubscribeLinks {
        return {
            unsubscribeApiUrl: `${this.config.appBaseUrl}/api/unsubscribe/${unsubscribeToken}`,
            unsubscribePageUrl: `${this.config.appBaseUrl}/unsubscribe/${unsubscribeToken}`,
        };
    }
}
