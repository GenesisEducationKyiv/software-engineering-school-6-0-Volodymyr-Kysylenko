import { NextFunction, Request, Response } from "express";

import { env } from "../config/env.js";

const validateOrigin = (req: Request, res: Response, next: NextFunction) => {
    const protectedMethods = ["POST", "PUT", "PATCH", "DELETE"];

    if (!protectedMethods.includes(req.method)) {
        return next();
    }

    const allowedOrigins =
        env.NODE_ENV === "production"
            ? ["https://github-release-notifier.sylenity.com"]
            : [`http://localhost:${env.PORT}`, `http://127.0.0.1:${env.PORT}`];

    const origin = req.get("Origin");

    if (!origin) {
        return res.status(403).json({
            error: "Forbidden",
            message: "Origin header is required",
        });
    }

    if (!allowedOrigins.includes(origin)) {
        return res.status(403).json({
            error: "Forbidden",
            message: "Invalid origin",
        });
    }

    next();
};

export { validateOrigin };
