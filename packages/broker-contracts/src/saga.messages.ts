import { z } from "zod";

import { MessageEnvelopeSchema } from "./envelope.js";

export const SAGA_REPLY_VERSION = 1;

export const SagaReplyPayloadSchema = z.object({
    step: z.string().min(1),
    status: z.enum(["success", "failure"]),
    error: z.string().optional(),
});

export const SagaReplyEnvelopeSchema = MessageEnvelopeSchema(SagaReplyPayloadSchema).extend({
    type: z.literal("saga-reply"),
    version: z.literal(SAGA_REPLY_VERSION),
});

export type SagaReplyPayload = z.infer<typeof SagaReplyPayloadSchema>;
export type SagaReplyEnvelope = z.infer<typeof SagaReplyEnvelopeSchema>;
