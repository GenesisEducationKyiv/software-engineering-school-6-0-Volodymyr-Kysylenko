import type { NextFunction, Request, Response } from "express";

import type {
    ApiResponse,
    CreateSubscriptionRequest,
    ListSubscriptionsRequest,
    TokenParams,
} from "../../dto/subscription.dto.js";
import type { SubscriptionServicePort } from "../../services/subscription/subscription.types.js";

type ControllerMethod = (req: Request, res: Response, next: NextFunction) => void | Promise<void>;

interface SubscriptionApiControllerDependencies {
    subscriptionService: SubscriptionServicePort;
}

export class SubscriptionApiController {
    constructor(private readonly deps: SubscriptionApiControllerDependencies) {}

    subscribe: ControllerMethod = async (req, res, next) => {
        try {
            const { email, repo } = req.validatedBody as CreateSubscriptionRequest;

            await this.deps.subscriptionService.subscribe({ email, repo });

            const response: ApiResponse = {
                message: "Subscription successful. Confirmation email sent.",
            };

            res.status(201).json(response);
        } catch (error) {
            next(error);
        }
    };

    confirm: ControllerMethod = async (req, res, next) => {
        try {
            const { token } = req.validatedParams as TokenParams;

            await this.deps.subscriptionService.confirm(token);

            const response: ApiResponse = {
                message: "Subscription confirmed successfully",
            };

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    unsubscribe: ControllerMethod = async (req, res, next) => {
        try {
            const { token } = req.validatedParams as TokenParams;

            await this.deps.subscriptionService.unsubscribe(token);

            const response: ApiResponse = {
                message: "Unsubscribed successfully",
            };

            res.status(200).json(response);
        } catch (error) {
            next(error);
        }
    };

    list: ControllerMethod = async (req, res, next) => {
        try {
            const { email } = req.validatedQuery as ListSubscriptionsRequest;

            const result = await this.deps.subscriptionService.listByEmail(email);

            res.status(200).json(result);
        } catch (error) {
            next(error);
        }
    };
}
