import { randomUUID } from "node:crypto";

import { z } from "zod";

/**
 * Generic versioned message envelope shared by all broker messages.
 * `correlationId` ties together a chain of related messages/requests;
 * `causationId` points at the messageId that directly caused this message
 * (null for messages originating outside the broker, e.g. an HTTP request).
 */
export function MessageEnvelopeSchema<TPayload extends z.ZodTypeAny>(payloadSchema: TPayload) {
    return z.object({
        messageId: z.string().uuid(),
        type: z.string(),
        version: z.number().int().positive(),
        timestamp: z.string().datetime({ offset: true }),
        correlationId: z.string().min(1),
        causationId: z.string().min(1).nullable(),
        payload: payloadSchema,
    });
}

export interface MessageEnvelope<TType extends string = string, TPayload = unknown> {
    messageId: string;
    type: TType;
    version: number;
    timestamp: string;
    correlationId: string;
    causationId: string | null;
    payload: TPayload;
}

export interface CreateEnvelopeInput<TType extends string, TPayload> {
    type: TType;
    version: number;
    payload: TPayload;
    correlationId?: string;
    causationId?: string | null;
}

export function createEnvelope<TType extends string, TPayload>(
    input: CreateEnvelopeInput<TType, TPayload>,
): MessageEnvelope<TType, TPayload> {
    return {
        messageId: randomUUID(),
        type: input.type,
        version: input.version,
        timestamp: new Date().toISOString(),
        correlationId: input.correlationId ?? randomUUID(),
        causationId: input.causationId ?? null,
        payload: input.payload,
    };
}
