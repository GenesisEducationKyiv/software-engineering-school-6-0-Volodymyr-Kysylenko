import { z } from "zod";

import { MessageEnvelopeSchema } from "./envelope.js";
import { EMAIL_CONFIRMATION_ROUTING_KEY, EMAIL_NEW_RELEASE_ROUTING_KEY } from "./topology.js";

export const NOTIFICATION_CONTRACT_VERSION = 1;

export const SendConfirmationEmailPayloadSchema = z.object({
    to: z.string().email(),
    repo: z.string().min(1),
    confirmToken: z.string().min(1),
    unsubscribeToken: z.string().min(1),
});

export const SendNewReleaseEmailPayloadSchema = z.object({
    to: z.string().email(),
    repo: z.string().min(1),
    releaseName: z.string().nullable(),
    tagName: z.string().min(1),
    releaseUrl: z.string().url(),
    unsubscribeToken: z.string().min(1),
});

export const SendConfirmationEmailEnvelopeSchema = MessageEnvelopeSchema(SendConfirmationEmailPayloadSchema).extend({
    type: z.literal("send-confirmation-email"),
    version: z.literal(NOTIFICATION_CONTRACT_VERSION),
});

export const SendNewReleaseEmailEnvelopeSchema = MessageEnvelopeSchema(SendNewReleaseEmailPayloadSchema).extend({
    type: z.literal("send-new-release-email"),
    version: z.literal(NOTIFICATION_CONTRACT_VERSION),
});

export const NotificationEmailEnvelopeSchema = z.discriminatedUnion("type", [
    SendConfirmationEmailEnvelopeSchema,
    SendNewReleaseEmailEnvelopeSchema,
]);

export type SendConfirmationEmailPayload = z.infer<typeof SendConfirmationEmailPayloadSchema>;
export type SendNewReleaseEmailPayload = z.infer<typeof SendNewReleaseEmailPayloadSchema>;
export type SendConfirmationEmailEnvelope = z.infer<typeof SendConfirmationEmailEnvelopeSchema>;
export type SendNewReleaseEmailEnvelope = z.infer<typeof SendNewReleaseEmailEnvelopeSchema>;
export type NotificationEmailEnvelope = z.infer<typeof NotificationEmailEnvelopeSchema>;
export type NotificationEmailCommandType = NotificationEmailEnvelope["type"];

export const NOTIFICATION_ROUTING_KEYS: Record<NotificationEmailCommandType, string> = {
    "send-confirmation-email": EMAIL_CONFIRMATION_ROUTING_KEY,
    "send-new-release-email": EMAIL_NEW_RELEASE_ROUTING_KEY,
};
