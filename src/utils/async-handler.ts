import type { NextFunction, Request, RequestHandler, Response } from "express";

type AsyncHandlerInput = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

export function asyncHandler(fn: AsyncHandlerInput): RequestHandler {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
}
