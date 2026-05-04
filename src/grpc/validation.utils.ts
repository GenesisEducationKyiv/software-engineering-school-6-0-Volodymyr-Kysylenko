import type { StatusObject } from "@grpc/grpc-js";
import * as grpc from "@grpc/grpc-js";
import { ZodError, ZodSchema } from "zod";

type GrpcValidationError = Partial<StatusObject> & {
    code: grpc.status;
    details: string;
};

type GrpcValidationResult<T> =
    | {
          success: true;
          data: T;
      }
    | {
          success: false;
          error: GrpcValidationError;
      };

/**
 * Validates gRPC request data using Zod schema
 * Returns validation result with gRPC-compatible error format
 */
export function validateGrpcRequest<T>(requestData: unknown, schema: ZodSchema<T>): GrpcValidationResult<T> {
    try {
        const validatedData = schema.parse(requestData);

        return {
            success: true,
            data: validatedData,
        };
    } catch (error) {
        if (error instanceof ZodError) {
            const errorMessages = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join("; ");

            return {
                success: false,
                error: {
                    code: grpc.status.INVALID_ARGUMENT,
                    details: `Validation failed: ${errorMessages}`,
                },
            };
        }

        return {
            success: false,
            error: {
                code: grpc.status.INTERNAL,
                details: "Validation error occurred",
            },
        };
    }
}

/**
 * Maps HTTP status codes to gRPC status codes
 */
export function mapHttpToGrpcStatus(httpCode: number): grpc.status {
    switch (httpCode) {
        case 400:
            return grpc.status.INVALID_ARGUMENT;
        case 404:
            return grpc.status.NOT_FOUND;
        case 409:
            return grpc.status.ALREADY_EXISTS;
        case 429:
            return grpc.status.RESOURCE_EXHAUSTED;
        case 500:
            return grpc.status.INTERNAL;
        default:
            return grpc.status.INTERNAL;
    }
}
