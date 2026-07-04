import * as grpc from "@grpc/grpc-js";

import { CreateSubscriptionDto, ListSubscriptionsDto, TokenParamsDto } from "../dto/subscription.dto.js";
import { subscriptionService } from "../services/services.module.js";
import { AppError } from "../utils/errors.js";
import type { SubscriptionServiceServer } from "./buf-generated/subscription.js";
import { mapHttpToGrpcStatus, validateGrpcRequest } from "./validation.utils.js";

function createGrpcError(code: grpc.status, details: string): grpc.ServiceError {
    return {
        name: "ServiceError",
        message: details,
        code,
        details,
        metadata: new grpc.Metadata(),
    };
}

function handleGrpcError(error: unknown): grpc.ServiceError {
    if (error instanceof AppError) {
        return createGrpcError(mapHttpToGrpcStatus(error.statusCode), error.message);
    }

    return createGrpcError(grpc.status.INTERNAL, "Internal server error");
}

async function handleSubscribe(
    call: Parameters<SubscriptionServiceServer["subscribe"]>[0],
    callback: Parameters<SubscriptionServiceServer["subscribe"]>[1],
): Promise<void> {
    try {
        const { email, repo } = call.request;

        const validation = validateGrpcRequest({ email, repo }, CreateSubscriptionDto);

        if (!validation.success) {
            callback(validation.error);
            return;
        }

        await subscriptionService.subscribe(validation.data);

        callback(null, { message: "Subscription successful. Confirmation email sent." });
    } catch (error) {
        callback(handleGrpcError(error));
    }
}

async function handleConfirm(
    call: Parameters<SubscriptionServiceServer["confirm"]>[0],
    callback: Parameters<SubscriptionServiceServer["confirm"]>[1],
): Promise<void> {
    try {
        const { token } = call.request;

        const validation = validateGrpcRequest({ token }, TokenParamsDto);

        if (!validation.success) {
            callback(validation.error);
            return;
        }

        await subscriptionService.confirm(validation.data.token);

        callback(null, { message: "Subscription confirmed successfully" });
    } catch (error) {
        callback(handleGrpcError(error));
    }
}

async function handleUnsubscribe(
    call: Parameters<SubscriptionServiceServer["unsubscribe"]>[0],
    callback: Parameters<SubscriptionServiceServer["unsubscribe"]>[1],
): Promise<void> {
    try {
        const { token } = call.request;

        const validation = validateGrpcRequest({ token }, TokenParamsDto);

        if (!validation.success) {
            callback(validation.error);
            return;
        }

        await subscriptionService.unsubscribe(validation.data.token);

        callback(null, { message: "Unsubscribed successfully" });
    } catch (error) {
        callback(handleGrpcError(error));
    }
}

async function handleGetSubscriptions(
    call: Parameters<SubscriptionServiceServer["getSubscriptions"]>[0],
    callback: Parameters<SubscriptionServiceServer["getSubscriptions"]>[1],
): Promise<void> {
    try {
        const { email } = call.request;

        const validation = validateGrpcRequest({ email }, ListSubscriptionsDto);

        if (!validation.success) {
            callback(validation.error);
            return;
        }

        const subscriptions = await subscriptionService.listByEmail(validation.data.email);

        callback(null, {
            subscriptions: subscriptions.map((sub) => ({
                email: sub.email,
                repo: sub.repo,
                confirmed: sub.confirmed,
                lastSeenTag: sub.last_seen_tag ?? "",
            })),
        });
    } catch (error) {
        callback(handleGrpcError(error));
    }
}

export const subscriptionHandlers: SubscriptionServiceServer = {
    subscribe(call, callback) {
        handleSubscribe(call, callback).catch((error: unknown) => {
            callback(handleGrpcError(error));
        });
    },

    confirm(call, callback) {
        handleConfirm(call, callback).catch((error: unknown) => {
            callback(handleGrpcError(error));
        });
    },

    unsubscribe(call, callback) {
        handleUnsubscribe(call, callback).catch((error: unknown) => {
            callback(handleGrpcError(error));
        });
    },

    getSubscriptions(call, callback) {
        handleGetSubscriptions(call, callback).catch((error: unknown) => {
            callback(handleGrpcError(error));
        });
    },
};
