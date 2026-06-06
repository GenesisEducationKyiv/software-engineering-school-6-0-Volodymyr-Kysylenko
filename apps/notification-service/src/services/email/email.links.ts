import type { ConfirmationLinks, EmailLinkBuilderPort, UnsubscribeLinks } from "./email.types.js";

export class AppEmailLinkBuilder implements EmailLinkBuilderPort {
    buildConfirmationLinks(confirmToken: string, unsubscribeToken: string, appBaseUrl: string): ConfirmationLinks {
        return {
            confirmApiUrl: `${appBaseUrl}/api/confirm/${confirmToken}`,
            unsubscribeApiUrl: `${appBaseUrl}/api/unsubscribe/${unsubscribeToken}`,
            confirmPageUrl: `${appBaseUrl}/confirm/${confirmToken}`,
            unsubscribePageUrl: `${appBaseUrl}/unsubscribe/${unsubscribeToken}`,
        };
    }

    buildUnsubscribeLinks(unsubscribeToken: string, appBaseUrl: string): UnsubscribeLinks {
        return {
            unsubscribeApiUrl: `${appBaseUrl}/api/unsubscribe/${unsubscribeToken}`,
            unsubscribePageUrl: `${appBaseUrl}/unsubscribe/${unsubscribeToken}`,
        };
    }
}
