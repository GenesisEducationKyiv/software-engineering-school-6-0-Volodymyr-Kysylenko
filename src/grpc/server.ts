import * as grpc from "@grpc/grpc-js";

import { logger } from "../utils/logger/logger.js";
import { SubscriptionServiceService } from "./buf-generated/subscription.js";
import { subscriptionHandlers } from "./subscription.handlers.js";

export function createGrpcServer(): grpc.Server {
    const server = new grpc.Server();

    server.addService(SubscriptionServiceService, subscriptionHandlers);

    return server;
}

export async function startGrpcServer(port: number): Promise<void> {
    return new Promise((resolve, reject) => {
        const server = createGrpcServer();

        server.bindAsync(`0.0.0.0:${port}`, grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
            if (error) {
                reject(error);
                return;
            }

            logger.info(`gRPC server started on port ${boundPort}`);
            resolve();
        });
    });
}
