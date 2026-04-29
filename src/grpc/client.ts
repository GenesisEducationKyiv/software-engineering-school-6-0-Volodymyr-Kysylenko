import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import path from "node:path";
import { fileURLToPath } from "node:url";

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

const subscriptionProto = grpc.loadPackageDefinition(packageDefinition).subscription as any;

export function createGrpcClient(serverAddress: string = "localhost:50051") {
    return new subscriptionProto.SubscriptionService(serverAddress, grpc.credentials.createInsecure());
}

export async function subscribeViaGrpc(email: string, repo: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const client = createGrpcClient();

        client.Subscribe({ email, repo }, (error: any, response: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

export async function confirmViaGrpc(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const client = createGrpcClient();

        client.Confirm({ token }, (error: any, response: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

export async function unsubscribeViaGrpc(token: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const client = createGrpcClient();

        client.Unsubscribe({ token }, (error: any, response: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}

export async function getSubscriptionsViaGrpc(email: string): Promise<any> {
    return new Promise((resolve, reject) => {
        const client = createGrpcClient();

        client.GetSubscriptions({ email }, (error: any, response: any) => {
            if (error) {
                reject(error);
            } else {
                resolve(response);
            }
        });
    });
}
