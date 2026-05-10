import * as grpc from "@grpc/grpc-js";

import { CreateSubscriptionDto, ListSubscriptionsDto, TokenParamsDto } from "../dto/subscription.dto.js";
import type { SubscriptionServicePort } from "../services/subscription/subscription.types.js";
import { AppError } from "../utils/errors.js";
import type { SubscriptionServiceHandlers } from "./generated/subscription/SubscriptionService.js";
import { mapHttpToGrpcStatus, validateGrpcRequest } from "./validation.utils.js";

export interface CreateSubscriptionHandlersDependencies {
    subscriptionService: SubscriptionServicePort;
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

function handleGrpcError(error: unknown): grpc.ServiceError {
    if (error instanceof AppError) {
        return createGrpcError(mapHttpToGrpcStatus(error.statusCode), error.message);
    }

    return createGrpcError(grpc.status.INTERNAL, "Internal server error");
}

async function handleSubscribe(
    subscriptionService: SubscriptionServicePort,
    call: Parameters<SubscriptionServiceHandlers["Subscribe"]>[0],
    callback: Parameters<SubscriptionServiceHandlers["Subscribe"]>[1],
): Promise<void> {
    try {
        const { email, repo } = call.request;

        const validation = validateGrpcRequest({ email, repo }, CreateSubscriptionDto);

        if (!validation.success) {
            callback(validation.error);
            return;
        }

        await subscriptionService.subscribe(validation.data);

        callback(null, {
            message: "Subscription successful. Confirmation email sent.",
        });
    } catch (error) {
        callback(handleGrpcError(error));
    }
}

async function handleConfirm(
    subscriptionService: SubscriptionServicePort,
    call: Parameters<SubscriptionServiceHandlers["Confirm"]>[0],
    callback: Parameters<SubscriptionServiceHandlers["Confirm"]>[1],
): Promise<void> {
    try {
        const { token } = call.request;

        const validation = validateGrpcRequest({ token }, TokenParamsDto);

        if (!validation.success) {
            callback(validation.error);
            return;
        }

        await subscriptionService.confirm(validation.data.token);

        callback(null, {
            message: "Subscription confirmed successfully",
        });
    } catch (error) {
        callback(handleGrpcError(error));
    }
}

async function handleUnsubscribe(
    subscriptionService: SubscriptionServicePort,
    call: Parameters<SubscriptionServiceHandlers["Unsubscribe"]>[0],
    callback: Parameters<SubscriptionServiceHandlers["Unsubscribe"]>[1],
): Promise<void> {
    try {
        const { token } = call.request;

        const validation = validateGrpcRequest({ token }, TokenParamsDto);

        if (!validation.success) {
            callback(validation.error);
            return;
        }

        await subscriptionService.unsubscribe(validation.data.token);

        callback(null, {
            message: "Unsubscribed successfully",
        });
    } catch (error) {
        callback(handleGrpcError(error));
    }
}

async function handleGetSubscriptions(
    subscriptionService: SubscriptionServicePort,
    call: Parameters<SubscriptionServiceHandlers["GetSubscriptions"]>[0],
    callback: Parameters<SubscriptionServiceHandlers["GetSubscriptions"]>[1],
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
                last_seen_tag: sub.last_seen_tag ?? "",
            })),
        });
    } catch (error) {
        callback(handleGrpcError(error));
    }
}

export function createSubscriptionHandlers(deps: CreateSubscriptionHandlersDependencies): SubscriptionServiceHandlers {
    const { subscriptionService } = deps;

    return {
        Subscribe(call, callback) {
            handleSubscribe(subscriptionService, call, callback).catch((error: unknown) => {
                callback(handleGrpcError(error));
            });
        },

        Confirm(call, callback) {
            handleConfirm(subscriptionService, call, callback).catch((error: unknown) => {
                callback(handleGrpcError(error));
            });
        },

        Unsubscribe(call, callback) {
            handleUnsubscribe(subscriptionService, call, callback).catch((error: unknown) => {
                callback(handleGrpcError(error));
            });
        },

        GetSubscriptions(call, callback) {
            handleGetSubscriptions(subscriptionService, call, callback).catch((error: unknown) => {
                callback(handleGrpcError(error));
            });
        },
    };
}
