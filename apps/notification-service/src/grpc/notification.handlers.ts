import * as grpc from "@grpc/grpc-js";

import type { EmailServicePort } from "../services/email/email.types.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";
import type { NotificationServiceServer } from "./buf-generated/notification.js";

export interface NotificationHandlersDeps {
    emailService: EmailServicePort;
    logger: LoggerPort;
    appBaseUrl: string;
}

function createGrpcError(code: grpc.status, details: string): grpc.ServiceError {
    return {
        name: "ServiceError",
        message: details,
        code,
        details,
        metadata: new grpc.Metadata(),
    };
}

function replyError(callback: grpc.sendUnaryData<{ success: boolean }>, logger: LoggerPort, error: unknown): void {
    logger.error("gRPC notification handler error", error);
    callback(createGrpcError(grpc.status.INTERNAL, "Internal server error"));
}

function validateRequiredFields(
    fields: Record<string, string>,
    callback: grpc.sendUnaryData<{ success: boolean }>,
): boolean {
    const missing = Object.entries(fields)
        .filter(([, v]) => !v)
        .map(([k]) => k);

    if (missing.length > 0) {
        callback(createGrpcError(grpc.status.INVALID_ARGUMENT, `Missing required fields: ${missing.join(", ")}`));
        return false;
    }
    return true;
}

export function createNotificationHandlers(deps: NotificationHandlersDeps): NotificationServiceServer {
    const { emailService, logger, appBaseUrl } = deps;

    return {
        sendConfirmationEmail(call, callback) {
            const { email, repo, confirmToken, unsubscribeToken } = call.request;
            if (!validateRequiredFields({ email, repo, confirmToken, unsubscribeToken }, callback)) return;
            emailService
                .sendConfirmationEmail({ to: email, repo, confirmToken, unsubscribeToken, appBaseUrl })
                .then(() => callback(null, { success: true }))
                .catch((err: unknown) => replyError(callback, logger, err));
        },

        sendNewReleaseEmail(call, callback) {
            const { email, repo, releaseName, tagName, releaseUrl, unsubscribeToken } = call.request;
            if (!validateRequiredFields({ email, repo, tagName, releaseUrl, unsubscribeToken }, callback)) return;
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
