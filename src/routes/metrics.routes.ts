import { Router } from "express";
import { metricsController } from "../controllers/metrics.controller.js";

const { healthCheck, metricsCheck } = metricsController;

export const metricsRouter = Router();

metricsRouter.get("/metrics", metricsCheck);
metricsRouter.get("/health", healthCheck);
