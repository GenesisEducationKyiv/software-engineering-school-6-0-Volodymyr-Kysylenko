import path from "node:path";

import type { SubscriptionServicePort } from "../../services/subscription/subscription.types.js";
import { SubscriptionApiController } from "./subscription.controller.js";
import { type StaticPagePaths, SubscriptionPageController } from "./subscription-page.controller.js";

const publicDir = path.resolve(process.cwd(), "public");

const defaultPages: StaticPagePaths = {
    confirm: path.join(publicDir, "confirm.html"),
    unsubscribe: path.join(publicDir, "unsubscribe.html"),
    subscriptions: path.join(publicDir, "subscriptions.html"),
    error: path.join(publicDir, "error.html"),
};

export interface CreateSubscriptionControllersDependencies {
    subscriptionService: SubscriptionServicePort;
    pages?: StaticPagePaths;
}

export interface SubscriptionControllers {
    subscriptionApiController: SubscriptionApiController;
    subscriptionPageController: SubscriptionPageController;
}

export function createSubscriptionControllers(
    deps: CreateSubscriptionControllersDependencies,
): SubscriptionControllers {
    return {
        subscriptionApiController: new SubscriptionApiController({
            subscriptionService: deps.subscriptionService,
        }),
        subscriptionPageController: new SubscriptionPageController({
            subscriptionService: deps.subscriptionService,
            pages: deps.pages ?? defaultPages,
        }),
    };
}
