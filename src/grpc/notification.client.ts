import * as grpc from "@grpc/grpc-js";

import {
    NotificationServiceClient,
    type SendConfirmationEmailRequest,
    type SendConfirmationEmailResponse,
    type SendNewReleaseEmailRequest,
    type SendNewReleaseEmailResponse,
} from "./buf-generated/notification.js";

async function callUnary<Req, Res>(
    method: (req: Req, callback: (err: grpc.ServiceError | null, res: Res) => void) => grpc.ClientUnaryCall,
    request: Req,
): Promise<Res> {
    return new Promise((resolve, reject) => {
        method(request, (error, response) => {
            if (error) {
                reject(error);
                return;
            }
            resolve(response);
        });
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
