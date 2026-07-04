import { Router } from "express";

import { createEmailController, type EmailControllerDeps } from "../controllers/email.controller.js";

export function createEmailRouter(deps: EmailControllerDeps): Router {
    const router = Router();
    const controller = createEmailController(deps);

    router.post("/send-confirmation", (req, res) => {
        controller.sendConfirmationEmail(req, res);
    });

    router.post("/send-new-release", (req, res) => {
        controller.sendNewReleaseEmail(req, res);
    });

    return router;
}
