import * as grpc from "@grpc/grpc-js";

import { env } from "../config/env.js";
import {
    type ConfirmRequest,
    type ConfirmResponse,
    type GetSubscriptionsRequest,
    type GetSubscriptionsResponse,
    type SubscribeRequest,
    type SubscribeResponse,
    SubscriptionServiceClient,
    type UnsubscribeRequest,
    type UnsubscribeResponse,
} from "./buf-generated/subscription.js";

function resolveGrpcResponse<T>(
    response: T | undefined,
    resolve: (value: T) => void,
    reject: (reason?: unknown) => void,
): void {
    if (!response) {
        reject(new Error("gRPC response is empty"));
        return;
    }

    resolve(response);
}

export function createGrpcClient(serverAddress = `localhost:${env.GRPC_PORT}`): SubscriptionServiceClient {
    return new SubscriptionServiceClient(serverAddress, grpc.credentials.createInsecure());
}

const grpcClient = createGrpcClient();

export function getGrpcClient(): SubscriptionServiceClient {
    return grpcClient;
}

export async function subscribeViaGrpc(email: string, repo: string): Promise<SubscribeResponse> {
    return new Promise((resolve, reject) => {
        const request: SubscribeRequest = { email, repo };

        grpcClient.subscribe(request, (error, response) => {
            if (error) {
                reject(error);
                return;
            }
            resolveGrpcResponse(response, resolve, reject);
        });
    });
}

export async function confirmViaGrpc(token: string): Promise<ConfirmResponse> {
    return new Promise((resolve, reject) => {
        const request: ConfirmRequest = { token };

        grpcClient.confirm(request, (error, response) => {
            if (error) {
                reject(error);
                return;
            }
            resolveGrpcResponse(response, resolve, reject);
        });
    });
}

export async function unsubscribeViaGrpc(token: string): Promise<UnsubscribeResponse> {
    return new Promise((resolve, reject) => {
        const request: UnsubscribeRequest = { token };

        grpcClient.unsubscribe(request, (error, response) => {
            if (error) {
                reject(error);
                return;
            }
            resolveGrpcResponse(response, resolve, reject);
        });
    });
}

export async function getSubscriptionsViaGrpc(email: string): Promise<GetSubscriptionsResponse> {
    return new Promise((resolve, reject) => {
        const request: GetSubscriptionsRequest = { email };

        grpcClient.getSubscriptions(request, (error, response) => {
            if (error) {
                reject(error);
                return;
            }
            resolveGrpcResponse(response, resolve, reject);
        });
    });
}
