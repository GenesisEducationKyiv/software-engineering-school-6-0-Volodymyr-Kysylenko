import * as grpc from "@grpc/grpc-js";

import type { EmailServicePort } from "../services/email/email.types.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";
import type { NotificationServiceServer } from "./buf-generated/notification.js";

export interface NotificationHandlersDeps {
    emailService: EmailServicePort;
    logger: LoggerPort;
    appBaseUrl: string;
}

function replyError(callback: grpc.sendUnaryData<{ success: boolean }>, logger: LoggerPort, error: unknown): void {
    logger.error("gRPC notification handler error", error);
    callback({ code: grpc.status.INTERNAL, message: "Internal server error" });
}

export function createNotificationHandlers(deps: NotificationHandlersDeps): NotificationServiceServer {
    const { emailService, logger, appBaseUrl } = deps;

    return {
        sendConfirmationEmail(call, callback) {
            const { email, repo, confirmToken, unsubscribeToken } = call.request;
            emailService
                .sendConfirmationEmail({ to: email, repo, confirmToken, unsubscribeToken, appBaseUrl })
                .then(() => callback(null, { success: true }))
                .catch((err: unknown) => replyError(callback, logger, err));
        },

        sendNewReleaseEmail(call, callback) {
            const { email, repo, releaseName, tagName, releaseUrl, unsubscribeToken } = call.request;
            emailService
                .sendNewReleaseEmail({
                    to: email,
                    repo,
                    releaseName: releaseName || null,
                    tagName,
                    releaseUrl,
                    unsubscribeToken,
                    appBaseUrl,
                })
                .then(() => callback(null, { success: true }))
                .catch((err: unknown) => replyError(callback, logger, err));
        },
    };
}
