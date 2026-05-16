import path from "node:path";
import { fileURLToPath } from "node:url";

import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";

import { logger } from "../utils/logger/logger.js";
import type { ProtoGrpcType } from "./generated/subscription.js";
import { subscriptionHandlers } from "./subscription.handlers.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROTO_PATH = path.resolve(__dirname, "../../proto/subscription.proto");

// Load proto file
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
});

const proto = grpc.loadPackageDefinition(packageDefinition) as unknown as ProtoGrpcType;

export function createGrpcServer(): grpc.Server {
    const server = new grpc.Server();

    server.addService(proto.subscription.SubscriptionService.service, subscriptionHandlers);

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
