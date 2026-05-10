import { Router } from "express";

import { createSubscriptionControllers } from "../controllers/subscription/subscription.module.js";
import { CreateSubscriptionDto, ListSubscriptionsDto, TokenParamsDto } from "../dto/subscription.dto.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validation.middleware.js";
import { subscriptionService } from "../services/services.module.js";
import type { SubscriptionServicePort } from "../services/subscription/subscription.types.js";
import { asyncHandler } from "../utils/async-handler.js";

export interface CreateSubscriptionRoutersDependencies {
    subscriptionService: SubscriptionServicePort;
}

export interface SubscriptionRouters {
    subscriptionRouter: Router;
    subscriptionPagesRouter: Router;
}

export function createSubscriptionRouters(deps: CreateSubscriptionRoutersDependencies): SubscriptionRouters {
    const { subscriptionApiController, subscriptionPageController } = createSubscriptionControllers({
        subscriptionService: deps.subscriptionService,
    });
    const { subscribe, confirm, unsubscribe, list } = subscriptionApiController;
    const { confirmPage, unsubscribePage, subscriptionsPage } = subscriptionPageController;

    const subscriptionRouter = Router();
    subscriptionRouter.post("/subscribe", validateBody(CreateSubscriptionDto), asyncHandler(subscribe));
    subscriptionRouter.get("/confirm/:token", validateParams(TokenParamsDto), asyncHandler(confirm));
    subscriptionRouter.get("/unsubscribe/:token", validateParams(TokenParamsDto), asyncHandler(unsubscribe));
    subscriptionRouter.get("/subscriptions", validateQuery(ListSubscriptionsDto), asyncHandler(list));

    const subscriptionPagesRouter = Router();
    subscriptionPagesRouter.get("/confirm/:token", validateParams(TokenParamsDto), asyncHandler(confirmPage));
    subscriptionPagesRouter.get("/unsubscribe/:token", validateParams(TokenParamsDto), asyncHandler(unsubscribePage));
    subscriptionPagesRouter.get("/subscriptions", asyncHandler(subscriptionsPage));

    return {
        subscriptionRouter,
        subscriptionPagesRouter,
    };
}

const subscriptionRouters = createSubscriptionRouters({ subscriptionService });

export const subscriptionRouter = subscriptionRouters.subscriptionRouter;
export const subscriptionPagesRouter = subscriptionRouters.subscriptionPagesRouter;
