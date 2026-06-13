import type { ConfirmationLinks, EmailLinkBuilderPort, UnsubscribeLinks } from "./email.types.js";

export class AppEmailLinkBuilder implements EmailLinkBuilderPort {
    buildConfirmationLinks(confirmToken: string, unsubscribeToken: string, appBaseUrl: string): ConfirmationLinks {
        const base = trimTrailingSlash(appBaseUrl);
        const confirm = encodeURIComponent(confirmToken);
        const unsubscribe = encodeURIComponent(unsubscribeToken);
        return {
            confirmApiUrl: `${base}/api/confirm/${confirm}`,
            unsubscribeApiUrl: `${base}/api/unsubscribe/${unsubscribe}`,
            confirmPageUrl: `${base}/confirm/${confirm}`,
            unsubscribePageUrl: `${base}/unsubscribe/${unsubscribe}`,
        };
    }

    buildUnsubscribeLinks(unsubscribeToken: string, appBaseUrl: string): UnsubscribeLinks {
        const base = trimTrailingSlash(appBaseUrl);
        const unsubscribe = encodeURIComponent(unsubscribeToken);
        return {
            unsubscribeApiUrl: `${base}/api/unsubscribe/${unsubscribe}`,
            unsubscribePageUrl: `${base}/unsubscribe/${unsubscribe}`,
        };
    }
}

function trimTrailingSlash(url: string): string {
    return url.endsWith("/") ? url.slice(0, -1) : url;
}
