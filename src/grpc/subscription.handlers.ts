import * as grpc from "@grpc/grpc-js";
import { subscriptionService } from "../services/subscription.service.js";
import { AppError } from "../utils/errors.js";
import { CreateSubscriptionDto, TokenParamsDto, ListSubscriptionsDto } from "../dto/subscription.dto.js";
import { validateGrpcRequest, mapHttpToGrpcStatus } from "./validation.utils.js";

import type { SubscriptionServiceHandlers } from "./generated/subscription/SubscriptionService.js";

import type { SubscribeRequest__Output } from "./generated/subscription/SubscribeRequest.js";
import type { ConfirmRequest__Output } from "./generated/subscription/ConfirmRequest.js";
import type { UnsubscribeRequest__Output } from "./generated/subscription/UnsubscribeRequest.js";
import type { GetSubscriptionsRequest__Output } from "./generated/subscription/GetSubscriptionsRequest.js";

export const subscriptionHandlers: SubscriptionServiceHandlers = {
    async Subscribe(call, callback) {
        try {
            const request = call.request as SubscribeRequest__Output;
            const { email, repo } = request;

            const validation = validateGrpcRequest({ email, repo }, CreateSubscriptionDto);
            if (!validation.success) {
                return callback(validation.error);
            }

            const validatedData = validation.data;
            if (!validatedData) {
                return callback({
                    code: grpc.status.INTERNAL,
                    details: "Validation failed to return data",
                });
            }

            await subscriptionService.subscribe(validatedData);

            callback(null, {
                message: "Subscription successful. Confirmation email sent.",
            });
        } catch (error) {
            if (error instanceof AppError) {
                const grpcCode = mapHttpToGrpcStatus(error.statusCode);
                callback({
                    code: grpcCode,
                    details: error.message,
                });
            } else {
                callback({
                    code: grpc.status.INTERNAL,
                    details: "Internal server error",
                });
            }
        }
    },

    async Confirm(call, callback) {
        try {
            const request = call.request as ConfirmRequest__Output;
            const { token } = request;

            const validation = validateGrpcRequest({ token }, TokenParamsDto);
            if (!validation.success) {
                return callback(validation.error);
            }

            const validatedData = validation.data;
            if (!validatedData) {
                return callback({
                    code: grpc.status.INTERNAL,
                    details: "Validation failed to return data",
                });
            }

            const { token: validatedToken } = validatedData;
            await subscriptionService.confirm(validatedToken);

            callback(null, {
                message: "Subscription confirmed successfully",
            });
        } catch (error) {
            if (error instanceof AppError) {
                const grpcCode = mapHttpToGrpcStatus(error.statusCode);
                callback({
                    code: grpcCode,
                    details: error.message,
                });
            } else {
                callback({
                    code: grpc.status.INTERNAL,
                    details: "Internal server error",
                });
            }
        }
    },

    async Unsubscribe(call, callback) {
        try {
            const request = call.request as UnsubscribeRequest__Output;
            const { token } = request;

            const validation = validateGrpcRequest({ token }, TokenParamsDto);
            if (!validation.success) {
                return callback(validation.error);
            }

            const validatedData = validation.data;
            if (!validatedData) {
                return callback({
                    code: grpc.status.INTERNAL,
                    details: "Validation failed to return data",
                });
            }

            const { token: validatedToken } = validatedData;
            await subscriptionService.unsubscribe(validatedToken);

            callback(null, {
                message: "Unsubscribed successfully",
            });
        } catch (error) {
            if (error instanceof AppError) {
                const grpcCode = mapHttpToGrpcStatus(error.statusCode);
                callback({
                    code: grpcCode,
                    details: error.message,
                });
            } else {
                callback({
                    code: grpc.status.INTERNAL,
                    details: "Internal server error",
                });
            }
        }
    },

    async GetSubscriptions(call, callback) {
        try {
            const request = call.request as GetSubscriptionsRequest__Output;
            const { email } = request;

            const validation = validateGrpcRequest({ email }, ListSubscriptionsDto);
            if (!validation.success) {
                return callback(validation.error);
            }

            const validatedData = validation.data;
            if (!validatedData) {
                return callback({
                    code: grpc.status.INTERNAL,
                    details: "Validation failed to return data",
                });
            }

            const { email: validatedEmail } = validatedData;
            const subscriptions = await subscriptionService.listByEmail(validatedEmail);

            callback(null, {
                subscriptions: subscriptions.map((sub) => ({
                    email: sub.email,
                    repo: sub.repo,
                    confirmed: sub.confirmed,
                    last_seen_tag: sub.last_seen_tag || "",
                })),
            });
        } catch (error) {
            if (error instanceof AppError) {
                const grpcCode = mapHttpToGrpcStatus(error.statusCode);
                callback({
                    code: grpcCode,
                    details: error.message,
                });
            } else {
                callback({
                    code: grpc.status.INTERNAL,
                    details: "Internal server error",
                });
            }
        }
    },
};
