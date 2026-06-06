import { z } from "zod";

export const ConfirmationRequestSchema = z.object({
    to: z.string().email(),
    repo: z.string().min(1),
    confirmToken: z.string().min(1),
    unsubscribeToken: z.string().min(1),
    appBaseUrl: z.string().url(),
});

export const ReleaseRequestSchema = z.object({
    to: z.string().email(),
    repo: z.string().min(1),
    releaseName: z.string().nullable(),
    tagName: z.string().min(1),
    releaseUrl: z.string().url(),
    unsubscribeToken: z.string().min(1),
    appBaseUrl: z.string().url(),
});

export type ConfirmationRequest = z.infer<typeof ConfirmationRequestSchema>;
export type ReleaseRequest = z.infer<typeof ReleaseRequestSchema>;
