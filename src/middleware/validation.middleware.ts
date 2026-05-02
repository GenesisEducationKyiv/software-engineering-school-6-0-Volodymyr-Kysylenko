import type { Request, Response, NextFunction } from "express";
import { ZodError, type ZodSchema } from "zod";

interface ValidatedRequest<TBody = unknown, TQuery = unknown, TParams = unknown> extends Request {
    validatedBody?: TBody;
    validatedQuery?: TQuery;
    validatedParams?: TParams;
}

export function validateBody<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const validatedData = schema.parse(req.body);
            (req as ValidatedRequest<T>).validatedBody = validatedData;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                next(error); // Передаємо в error handler
            } else {
                next(error);
            }
        }
    };
}

export function validateQuery<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const validatedData = schema.parse(req.query);
            (req as ValidatedRequest<unknown, T>).validatedQuery = validatedData;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                next(error);
            } else {
                next(error);
            }
        }
    };
}

export function validateParams<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const validatedData = schema.parse(req.params);
            (req as ValidatedRequest<unknown, unknown, T>).validatedParams = validatedData;
            next();
        } catch (error) {
            if (error instanceof ZodError) {
                next(error);
            } else {
                next(error);
            }
        }
    };
}

// ESLint disable needed for Express type augmentation
/* eslint-disable @typescript-eslint/no-namespace */
declare global {
    namespace Express {
        interface Request {
            validatedBody?: unknown;
            validatedQuery?: unknown;
            validatedParams?: unknown;
        }
    }
}
