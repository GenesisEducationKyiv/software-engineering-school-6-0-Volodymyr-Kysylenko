import { z } from "zod";

export const CreateSubscriptionDto = z.object({
    email: z.string().email(),
    repo: z.string().regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/, "Invalid repo format"),
});

export const ListSubscriptionsDto = z.object({
    email: z.string().email(),
});

export const TokenParamsDto = z.object({
    token: z.string().min(1),
});

export const ApiResponseDto = z.object({
    message: z.string(),
    data: z.unknown().optional(),
});

export const ErrorResponseDto = z.object({
    message: z.string(),
    code: z.string().optional(),
    errors: z
        .array(
            z.object({
                field: z.string(),
                message: z.string(),
            }),
        )
        .optional(),
});

export type CreateSubscriptionRequest = z.infer<typeof CreateSubscriptionDto>;
export type ListSubscriptionsRequest = z.infer<typeof ListSubscriptionsDto>;
export type TokenParams = z.infer<typeof TokenParamsDto>;
export type ApiResponse = z.infer<typeof ApiResponseDto>;
export type ErrorResponse = z.infer<typeof ErrorResponseDto>;
