import type { Request, Response } from "express";
import { z } from "zod";

import type { EmailServicePort } from "../services/email/email.types.js";

const SendConfirmationSchema = z.object({
    to: z.string().email(),
    repo: z.string().min(1),
    confirmToken: z.string().min(1),
    unsubscribeToken: z.string().min(1),
});

const SendNewReleaseSchema = z.object({
    to: z.string().email(),
    repo: z.string().min(1),
    releaseName: z.string().nullable().optional(),
    tagName: z.string().min(1),
    releaseUrl: z.string().url(),
    unsubscribeToken: z.string().min(1),
});

export interface EmailControllerDeps {
    emailService: EmailServicePort;
    appBaseUrl: string;
}

export interface EmailController {
    sendConfirmationEmail(req: Request, res: Response): void;
    sendNewReleaseEmail(req: Request, res: Response): void;
}

export function createEmailController(deps: EmailControllerDeps): EmailController {
    const { emailService, appBaseUrl } = deps;

    return {
        sendConfirmationEmail(req: Request, res: Response): void {
            const parsed = SendConfirmationSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
                return;
            }
            void emailService
                .sendConfirmationEmail({ ...parsed.data, appBaseUrl })
                .then(() => res.status(200).json({ success: true }))
                .catch(() => res.status(500).json({ error: "Failed to send email" }));
        },

        sendNewReleaseEmail(req: Request, res: Response): void {
            const parsed = SendNewReleaseSchema.safeParse(req.body);
            if (!parsed.success) {
                res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
                return;
            }
            void emailService
                .sendNewReleaseEmail({ ...parsed.data, releaseName: parsed.data.releaseName ?? null, appBaseUrl })
                .then(() => res.status(200).json({ success: true }))
                .catch(() => res.status(500).json({ error: "Failed to send email" }));
        },
    };
}
