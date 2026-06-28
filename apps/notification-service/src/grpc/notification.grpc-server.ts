import * as grpc from "@grpc/grpc-js";

import type { EmailServicePort } from "../services/email/email.types.js";
import type { LoggerPort } from "../utils/logger/logger.types.js";
import { NotificationServiceService } from "./buf-generated/notification.js";
import { createNotificationHandlers } from "./notification.handlers.js";

export interface NotificationGrpcServerDeps {
    emailService: EmailServicePort;
    logger: LoggerPort;
    appBaseUrl: string;
}

export function createNotificationGrpcServer(deps: NotificationGrpcServerDeps): grpc.Server {
    const server = new grpc.Server();
    server.addService(NotificationServiceService, createNotificationHandlers(deps));
    return server;
}

export async function startNotificationGrpcServer(
    port: number,
    deps: NotificationGrpcServerDeps,
    host = "0.0.0.0",
): Promise<grpc.Server> {
    return new Promise((resolve, reject) => {
        const server = createNotificationGrpcServer(deps);
        server.bindAsync(`${host}:${port}`, grpc.ServerCredentials.createInsecure(), (error, boundPort) => {
            if (error) {
                reject(error);
                return;
            }
            deps.logger.info(`Notification gRPC server started on ${host}:${boundPort}`);
            resolve(server);
        });
    });
}
