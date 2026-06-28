import * as grpc from "@grpc/grpc-js";

import {
    NotificationServiceClient,
    type SendConfirmationEmailRequest,
    type SendConfirmationEmailResponse,
    type SendNewReleaseEmailRequest,
    type SendNewReleaseEmailResponse,
} from "./buf-generated/notification.js";

const GRPC_DEADLINE_MS = 5_000;

type UnaryMethod<Req, Res> = (
    request: Req,
    metadata: grpc.Metadata,
    options: grpc.CallOptions,
    callback: (error: grpc.ServiceError | null, response: Res | undefined) => void,
) => grpc.ClientUnaryCall;

async function callUnary<Req, Res>(method: UnaryMethod<Req, Res>, request: Req): Promise<Res> {
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

export interface NotificationGrpcClient {
    sendConfirmationEmail(req: SendConfirmationEmailRequest): Promise<SendConfirmationEmailResponse>;
    sendNewReleaseEmail(req: SendNewReleaseEmailRequest): Promise<SendNewReleaseEmailResponse>;
    close(): void;
}

export function createNotificationGrpcClient(address: string): NotificationGrpcClient {
    const client = new NotificationServiceClient(address, grpc.credentials.createInsecure());

    return {
        async sendConfirmationEmail(req: SendConfirmationEmailRequest): Promise<SendConfirmationEmailResponse> {
            return callUnary(client.sendConfirmationEmail.bind(client), req);
        },

        async sendNewReleaseEmail(req: SendNewReleaseEmailRequest): Promise<SendNewReleaseEmailResponse> {
            return callUnary(client.sendNewReleaseEmail.bind(client), req);
        },

        close(): void {
            client.close();
        },
    };
}
