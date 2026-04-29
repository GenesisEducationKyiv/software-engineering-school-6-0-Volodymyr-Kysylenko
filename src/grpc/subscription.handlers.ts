import * as grpc from "@grpc/grpc-js";
import { subscriptionService } from "../services/subscription.service.js";
import { AppError } from "../utils/errors.js";
import { CreateSubscriptionDto, TokenParamsDto, ListSubscriptionsDto } from "../dto/subscription.dto.js";
import { validateGrpcRequest, mapHttpToGrpcStatus } from "./validation.utils.js";

export const subscriptionHandlers = {
    async Subscribe(call: any, callback: any) {
        try {
            const { email, repo } = call.request;

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

    async Confirm(call: any, callback: any) {
        try {
            const { token } = call.request;

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

    async Unsubscribe(call: any, callback: any) {
        try {
            const { token } = call.request;

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

    async GetSubscriptions(call: any, callback: any) {
        try {
            const { email } = call.request;

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
