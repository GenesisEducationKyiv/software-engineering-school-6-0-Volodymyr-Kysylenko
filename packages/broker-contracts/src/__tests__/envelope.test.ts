import { describe, expect, it } from "vitest";
import { z } from "zod";

import { createEnvelope, MessageEnvelopeSchema } from "../envelope.js";

describe("MessageEnvelopeSchema", () => {
    const PayloadSchema = z.object({ to: z.string().email() });
    const EnvelopeSchema = MessageEnvelopeSchema(PayloadSchema);

    it("accepts an envelope created via createEnvelope", () => {
        const envelope = createEnvelope({
            type: "send-confirmation-email",
            version: 1,
            payload: { to: "user@example.com" },
        });

        expect(EnvelopeSchema.safeParse(envelope).success).toBe(true);
    });

    it("rejects an envelope with an invalid messageId", () => {
        const envelope = createEnvelope({
            type: "send-confirmation-email",
            version: 1,
            payload: { to: "user@example.com" },
        });

        const result = EnvelopeSchema.safeParse({ ...envelope, messageId: "not-a-uuid" });
        expect(result.success).toBe(false);
    });

    it("rejects an envelope with an invalid payload", () => {
        const envelope = createEnvelope({
            type: "send-confirmation-email",
            version: 1,
            payload: { to: "not-an-email" },
        });

        const result = EnvelopeSchema.safeParse(envelope);
        expect(result.success).toBe(false);
    });
});

describe("createEnvelope", () => {
    it("generates a unique messageId and correlationId per call", () => {
        const first = createEnvelope({ type: "x", version: 1, payload: {} });
        const second = createEnvelope({ type: "x", version: 1, payload: {} });

        expect(first.messageId).not.toBe(second.messageId);
        expect(first.correlationId).not.toBe(second.correlationId);
    });

    it("defaults causationId to null and reuses a provided correlationId", () => {
        const envelope = createEnvelope({
            type: "x",
            version: 1,
            payload: {},
            correlationId: "corr-1",
        });

        expect(envelope.causationId).toBeNull();
        expect(envelope.correlationId).toBe("corr-1");
    });

    it("produces an ISO timestamp", () => {
        const envelope = createEnvelope({ type: "x", version: 1, payload: {} });
        expect(envelope.timestamp).toMatch(/Z|[+-]\d{2}:\d{2}$/);
    });

    it.each([0, -1, 1.5, NaN])("throws for invalid version %s", (version) => {
        expect(() => createEnvelope({ type: "x", version, payload: {} })).toThrow("version must be a positive integer");
    });

    it("throws when correlationId is an empty string", () => {
        expect(() => createEnvelope({ type: "x", version: 1, payload: {}, correlationId: "" })).toThrow(
            "correlationId must not be empty",
        );
    });

    it("throws when causationId is an empty string", () => {
        expect(() => createEnvelope({ type: "x", version: 1, payload: {}, causationId: "" })).toThrow(
            "causationId must not be empty",
        );
    });
});
