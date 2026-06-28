import path from "node:path";
import { fileURLToPath } from "node:url";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import { env } from "../config/env.js";
import type { ProtoGrpcType } from "./generated/subscription.js";
import type { ConfirmRequest } from "./generated/subscription/ConfirmRequest.js";
import type { ConfirmResponse__Output } from "./generated/subscription/ConfirmResponse.js";
import type { GetSubscriptionsRequest } from "./generated/subscription/GetSubscriptionsRequest.js";
import type { GetSubscriptionsResponse__Output } from "./generated/subscription/GetSubscriptionsResponse.js";
import type { SubscribeRequest } from "./generated/subscription/SubscribeRequest.js";
import type { SubscribeResponse__Output } from "./generated/subscription/SubscribeResponse.js";
import type { SubscriptionServiceClient } from "./generated/subscription/SubscriptionService.js";
import type { UnsubscribeRequest } from "./generated/subscription/UnsubscribeRequest.js";
import type { UnsubscribeResponse__Output } from "./generated/subscription/UnsubscribeResponse.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, "../../proto/subscription.proto");

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;
const subscriptionProto = proto.subscription;

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
    return new subscriptionProto.SubscriptionService(serverAddress, grpc.credentials.createInsecure());
}

const grpcClient = createGrpcClient();

export function getGrpcClient(): SubscriptionServiceClient {
    return grpcClient;
}

export async function subscribeViaGrpc(email: string, repo: string): Promise<SubscribeResponse__Output> {
    return new Promise((resolve, reject) => {
        const request: SubscribeRequest = {
            email,
            repo,
        };

        grpcClient.Subscribe(request, (error, response) => {
            if (error) {
                reject(error);
                return;
            }
            resolveGrpcResponse(response, resolve, reject);
        });
    });
}

export async function confirmViaGrpc(token: string): Promise<ConfirmResponse__Output> {
    return new Promise((resolve, reject) => {
        const request: ConfirmRequest = {
            token,
        };

        grpcClient.Confirm(request, (error, response) => {
            if (error) {
                reject(error);
                return;
            }

            resolveGrpcResponse(response, resolve, reject);
        });
    });
}

export async function unsubscribeViaGrpc(token: string): Promise<UnsubscribeResponse__Output> {
    return new Promise((resolve, reject) => {
        const request: UnsubscribeRequest = {
            token,
        };

        grpcClient.Unsubscribe(request, (error, response) => {
            if (error) {
                reject(error);
                return;
            }

            resolveGrpcResponse(response, resolve, reject);
        });
    });
}

export async function getSubscriptionsViaGrpc(email: string): Promise<GetSubscriptionsResponse__Output> {
    return new Promise((resolve, reject) => {
        const request: GetSubscriptionsRequest = {
            email,
        };

        grpcClient.GetSubscriptions(request, (error, response) => {
            if (error) {
                reject(error);
                return;
            }
            resolveGrpcResponse(response, resolve, reject);
        });
    });
}
