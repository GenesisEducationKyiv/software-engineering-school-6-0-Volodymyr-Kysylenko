import path from "node:path";
import type { Request, Response, NextFunction } from "express";
import { subscriptionService } from "../services/subscription.service.js";
import { AppError } from "../utils/errors.js";
import type { CreateSubscriptionRequest, ListSubscriptionsRequest, TokenParams, ApiResponse } from "../dto/subscription.dto.js";

type ControllerMethod = (req: Request, res: Response, next: NextFunction) => Promise<void>;

class SubscriptionController {
    subscribe: ControllerMethod = async (req, res) => {
        const { email, repo } = req.validatedBody as CreateSubscriptionRequest;

        await subscriptionService.subscribe({ email, repo });

        const response: ApiResponse = {
            message: "Subscription successful. Confirmation email sent.",
        };
        
        res.status(201).json(response);
    };

    confirm: ControllerMethod = async (req, res) => {
        const { token } = req.validatedParams as TokenParams;

        await subscriptionService.confirm(token);

        const response: ApiResponse = {
            message: "Subscription confirmed successfully"
        };
        
        res.status(200).json(response);
    };

    confirmPage: ControllerMethod = async (req, res) => {
        const { token } = req.validatedParams as TokenParams;

        try {
            await subscriptionService.confirm(token);
            res.status(200).sendFile(path.resolve(process.cwd(), "public", "confirm.html"));
        } catch (error) {
            if (error instanceof AppError && (error.statusCode === 400 || error.statusCode === 404)) {
                res.status(404).sendFile(path.resolve(process.cwd(), "public", "error.html"));
            } else {
                throw error;
            }
        }
    };

    unsubscribe: ControllerMethod = async (req, res) => {
        const { token } = req.validatedParams as TokenParams;

        await subscriptionService.unsubscribe(token);

        const response: ApiResponse = {
            message: "Unsubscribed successfully"
        };
        
        res.status(200).json(response);
    };

    unsubscribePage: ControllerMethod = async (req, res) => {
        const { token } = req.validatedParams as TokenParams;

        try {
            await subscriptionService.unsubscribe(token);
            res.status(200).sendFile(path.resolve(process.cwd(), "public", "unsubscribe.html"));
        } catch (error) {
            if (error instanceof AppError && (error.statusCode === 400 || error.statusCode === 404)) {
                res.status(404).sendFile(path.resolve(process.cwd(), "public", "error.html"));
            } else {
                throw error;
            }
        }
    };

    list: ControllerMethod = async (req, res) => {
        const { email } = req.validatedQuery as ListSubscriptionsRequest;

        const result = await subscriptionService.listByEmail(email);
        res.status(200).json(result);
    };

    subscriptionsPage: ControllerMethod = async (req, res) => {
        res.status(200).sendFile(path.resolve(process.cwd(), "public", "subscriptions.html"));
    };
}

export const subscriptionController = new SubscriptionController();
