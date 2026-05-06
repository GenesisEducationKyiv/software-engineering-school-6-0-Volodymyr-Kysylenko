import type { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";

const protectedMethods = ["POST", "PUT", "PATCH", "DELETE"];

const allowedOrigins =
    env.NODE_ENV === "production"
        ? [env.APP_BASE_URL]
        : [env.APP_BASE_URL, `http://localhost:${env.PORT}`, `http://127.0.0.1:${env.PORT}`];

const validateOrigin = (req: Request, res: Response, next: NextFunction): void => {
    if (!protectedMethods.includes(req.method)) {
        next();
        return;
    }

    const origin = req.get("Origin");

    if (!origin) {
        res.status(403).json({
            error: "Forbidden",
            message: "Origin header is required",
        });
        return;
    }

    if (!allowedOrigins.includes(origin)) {
        res.status(403).json({
            error: "Forbidden",
            message: "Invalid origin",
        });
        return;
    }

    next();
};

export { validateOrigin };
