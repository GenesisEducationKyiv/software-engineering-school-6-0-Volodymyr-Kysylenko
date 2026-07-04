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

const GRPC_DEADLINE_MS = 5_000;

type UnaryMethod<Req, Res> = (
    request: Req,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response: Res | undefined) => void,
) => grpc.ClientUnaryCall;

async function unaryCall<Req, Res>(method: UnaryMethod<Req, Res>, request: Req): Promise<Res> {
    return new Promise((resolve, reject) => {
        method(
            request,
            new grpc.Metadata(),
            { deadline: new Date(Date.now() + GRPC_DEADLINE_MS) },
            (error, response) => {
                if (error) {
                    reject(error);
                    return;
                }
                if (!response) {
                    reject(new Error("gRPC response is empty"));
                    return;
                }
                resolve(response);
            },
        );
    });
}

export function createGrpcClient(serverAddress = `localhost:${env.GRPC_PORT}`): SubscriptionServiceClient {
    return new SubscriptionServiceClient(serverAddress, grpc.credentials.createInsecure());
}

const grpcClient = createGrpcClient();

export function getGrpcClient(): SubscriptionServiceClient {
    return grpcClient;
}

export async function subscribeViaGrpc(email: string, repo: string): Promise<SubscribeResponse> {
    return unaryCall<SubscribeRequest, SubscribeResponse>(grpcClient.subscribe.bind(grpcClient), { email, repo });
}

export async function confirmViaGrpc(token: string): Promise<ConfirmResponse> {
    return unaryCall<ConfirmRequest, ConfirmResponse>(grpcClient.confirm.bind(grpcClient), { token });
}

export async function unsubscribeViaGrpc(token: string): Promise<UnsubscribeResponse> {
    return unaryCall<UnsubscribeRequest, UnsubscribeResponse>(grpcClient.unsubscribe.bind(grpcClient), { token });
}

export async function getSubscriptionsViaGrpc(email: string): Promise<GetSubscriptionsResponse> {
    return unaryCall<GetSubscriptionsRequest, GetSubscriptionsResponse>(grpcClient.getSubscriptions.bind(grpcClient), {
        email,
    });
}
