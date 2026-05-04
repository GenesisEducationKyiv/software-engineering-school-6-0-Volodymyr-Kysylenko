import { Router } from "express";

import { subscriptionController } from "../controllers/subscription.controller.js";
import { CreateSubscriptionDto, ListSubscriptionsDto, TokenParamsDto } from "../dto/subscription.dto.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validation.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

const { subscribe, confirm, unsubscribe, list } = subscriptionController;
const { confirmPage, unsubscribePage, subscriptionsPage } = subscriptionController;

// API
export const subscriptionRouter = Router();
subscriptionRouter.post("/subscribe", validateBody(CreateSubscriptionDto), asyncHandler(subscribe));
subscriptionRouter.get("/confirm/:token", validateParams(TokenParamsDto), asyncHandler(confirm));
subscriptionRouter.get("/unsubscribe/:token", validateParams(TokenParamsDto), asyncHandler(unsubscribe));
subscriptionRouter.get("/subscriptions", validateQuery(ListSubscriptionsDto), asyncHandler(list));

// HTML pages
export const subscriptionPagesRouter = Router();
subscriptionPagesRouter.get("/confirm/:token", validateParams(TokenParamsDto), asyncHandler(confirmPage));
subscriptionPagesRouter.get("/unsubscribe/:token", validateParams(TokenParamsDto), asyncHandler(unsubscribePage));
subscriptionPagesRouter.get("/subscriptions", asyncHandler(subscriptionsPage));
