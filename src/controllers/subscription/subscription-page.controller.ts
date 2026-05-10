import type { NextFunction, Request, Response } from "express";

import type { TokenParams } from "../../dto/subscription.dto.js";
import type { SubscriptionServicePort } from "../../services/subscription/subscription.types.js";
import { AppError } from "../../utils/errors.js";

type ControllerMethod = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

export interface StaticPagePaths {
    confirm: string;
    unsubscribe: string;
    subscriptions: string;
    error: string;
}

interface SubscriptionPageControllerDependencies {
    subscriptionService: SubscriptionServicePort;
    pages: StaticPagePaths;
}

export class SubscriptionPageController {
    constructor(private readonly deps: SubscriptionPageControllerDependencies) {}

    confirmPage: ControllerMethod = async (req, res, next) => {
        try {
            const { token } = req.validatedParams as TokenParams;

            await this.deps.subscriptionService.confirm(token);

            res.status(200).sendFile(this.deps.pages.confirm);
        } catch (error) {
            this.handleTokenPageError(error, res, next);
        }
    };

    unsubscribePage: ControllerMethod = async (req, res, next) => {
        try {
            const { token } = req.validatedParams as TokenParams;

            await this.deps.subscriptionService.unsubscribe(token);

            res.status(200).sendFile(this.deps.pages.unsubscribe);
        } catch (error) {
            this.handleTokenPageError(error, res, next);
        }
    };

    subscriptionsPage: ControllerMethod = (_req, res) => {
        res.status(200).sendFile(this.deps.pages.subscriptions);
    };

    private handleTokenPageError(error: unknown, res: Response, next: NextFunction): void {
        if (error instanceof AppError && (error.statusCode === 400 || error.statusCode === 404)) {
            res.status(404).sendFile(this.deps.pages.error);
            return;
        }

        next(error);
    }
}
