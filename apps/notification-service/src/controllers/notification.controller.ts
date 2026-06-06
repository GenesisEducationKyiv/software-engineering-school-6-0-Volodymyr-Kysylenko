import type { Request, Response } from "express";

import { ConfirmationRequestSchema, ReleaseRequestSchema } from "../dto/notification.dto.js";
import type { HealthServicePort } from "../health/health.types.js";
import type { EmailServicePort } from "../services/email/email.types.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";

export interface NotificationController {
    sendConfirmation(req: Request, res: Response): Promise<void>;
    sendRelease(req: Request, res: Response): Promise<void>;
    health(req: Request, res: Response): void;
}

export interface NotificationControllerDeps {
    emailService: EmailServicePort;
    healthService: HealthServicePort;
    logger: LoggerPort;
}

export function createNotificationController(deps: NotificationControllerDeps): NotificationController {
    const { emailService, healthService, logger } = deps;

    return {
        async sendConfirmation(req: Request, res: Response): Promise<void> {
            const result = ConfirmationRequestSchema.safeParse(req.body);
            if (!result.success) {
                res.status(400).json({ error: "Invalid request body", details: result.error.flatten() });
                return;
            }
            try {
                await emailService.sendConfirmationEmail(result.data);
                res.status(200).json({ ok: true });
            } catch (error) {
                logger.error("Failed to send confirmation email", error, {
                    requestId: res.locals.requestId as string | undefined,
                    to: result.data.to,
                    repo: result.data.repo,
                });
                res.status(500).json({ error: "Failed to send email" });
            }
        },

        async sendRelease(req: Request, res: Response): Promise<void> {
            const result = ReleaseRequestSchema.safeParse(req.body);
            if (!result.success) {
                res.status(400).json({ error: "Invalid request body", details: result.error.flatten() });
                return;
            }
            try {
                await emailService.sendNewReleaseEmail(result.data);
                res.status(200).json({ ok: true });
            } catch (error) {
                logger.error("Failed to send release email", error, {
                    requestId: res.locals.requestId as string | undefined,
                    to: result.data.to,
                    repo: result.data.repo,
                    tagName: result.data.tagName,
                });
                res.status(500).json({ error: "Failed to send email" });
            }
        },

        health(_req: Request, res: Response): void {
            res.status(200).json(healthService.getHealth());
        },
    };
}
