import * as grpc from "@grpc/grpc-js";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { env } from "../config/env.js";
import { createGrpcClient } from "../grpc/client.js";
import { createGrpcServer } from "../grpc/server.js";

describe("gRPC Subscription Service", () => {
    let server: grpc.Server;
    let client: ReturnType<typeof createGrpcClient>;
    const testPort = env.GRPC_PORT;

    beforeAll(async () => {
        server = createGrpcServer();

        await new Promise<void>((resolve, reject) => {
            server.bindAsync(`localhost:${testPort}`, grpc.ServerCredentials.createInsecure(), (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve();
            });
        });

        client = createGrpcClient(`localhost:${testPort}`);
    });

    afterAll(async () => {
        client.close();

        await new Promise<void>((resolve) => {
            server.tryShutdown(() => resolve());
        });
    });

    it("should reject invalid subscription request", async () => {
        const request = new Promise((resolve, reject) => {
            client.subscribe({ email: "invalid-email", repo: "invalid/repo/format" }, (error: any, response: any) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });

        await expect(request).rejects.toMatchObject({
            code: grpc.status.INVALID_ARGUMENT,
            details: expect.stringContaining("Validation failed"),
        });
    });

    it("should reject invalid token for confirm", async () => {
        const request = new Promise((resolve, reject) => {
            client.confirm({ token: "" }, (error: any, response: any) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });

        await expect(request).rejects.toMatchObject({
            code: grpc.status.INVALID_ARGUMENT,
            details: expect.stringContaining("String must contain at least 1 character"),
        });
    });

    it("should reject empty email for get subscriptions", async () => {
        const request = new Promise((resolve, reject) => {
            client.getSubscriptions({ email: "invalid-email" }, (error: any, response: any) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(response);
                }
            });
        });

        await expect(request).rejects.toMatchObject({
            code: grpc.status.INVALID_ARGUMENT,
            details: expect.stringContaining("Invalid email"),
        });
    });
});
