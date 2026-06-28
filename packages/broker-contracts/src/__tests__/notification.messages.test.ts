import { describe, expect, it } from "vitest";

import {
    NOTIFICATION_CONTRACT_VERSION,
    NotificationEmailEnvelopeSchema,
    SendConfirmationEmailEnvelopeSchema,
    SendNewReleaseEmailEnvelopeSchema,
} from "../notification.messages.js";

const BASE_FIELDS = {
    messageId: "11111111-1111-1111-1111-111111111111",
    timestamp: new Date().toISOString(),
    correlationId: "22222222-2222-2222-2222-222222222222",
    causationId: null,
};

const VALID_CONFIRMATION = {
    ...BASE_FIELDS,
    type: "send-confirmation-email" as const,
    version: NOTIFICATION_CONTRACT_VERSION,
    payload: {
        to: "user@example.com",
        repo: "owner/repo",
        confirmToken: "tok",
        unsubscribeToken: "unsub",
    },
};

const VALID_RELEASE = {
    ...BASE_FIELDS,
    type: "send-new-release-email" as const,
    version: NOTIFICATION_CONTRACT_VERSION,
    payload: {
        to: "user@example.com",
        repo: "owner/repo",
        releaseName: "v1.0.0",
        tagName: "v1.0.0",
        releaseUrl: "https://github.com/owner/repo/releases/tag/v1.0.0",
        unsubscribeToken: "unsub",
    },
};

describe("SendConfirmationEmailEnvelopeSchema", () => {
    it("accepts the current contract version", () => {
        expect(SendConfirmationEmailEnvelopeSchema.safeParse(VALID_CONFIRMATION).success).toBe(true);
    });

    it("rejects a wrong version", () => {
        const result = SendConfirmationEmailEnvelopeSchema.safeParse({ ...VALID_CONFIRMATION, version: 2 });
        expect(result.success).toBe(false);
    });
});

describe("SendNewReleaseEmailEnvelopeSchema", () => {
    it("accepts the current contract version", () => {
        expect(SendNewReleaseEmailEnvelopeSchema.safeParse(VALID_RELEASE).success).toBe(true);
    });

    it("rejects a wrong version", () => {
        const result = SendNewReleaseEmailEnvelopeSchema.safeParse({ ...VALID_RELEASE, version: 2 });
        expect(result.success).toBe(false);
    });
});

describe("NotificationEmailEnvelopeSchema", () => {
    it("accepts both message types at the correct version", () => {
        expect(NotificationEmailEnvelopeSchema.safeParse(VALID_CONFIRMATION).success).toBe(true);
        expect(NotificationEmailEnvelopeSchema.safeParse(VALID_RELEASE).success).toBe(true);
    });

    it("rejects either type when the version does not match the contract", () => {
        expect(NotificationEmailEnvelopeSchema.safeParse({ ...VALID_CONFIRMATION, version: 99 }).success).toBe(false);
        expect(NotificationEmailEnvelopeSchema.safeParse({ ...VALID_RELEASE, version: 99 }).success).toBe(false);
    });
});
