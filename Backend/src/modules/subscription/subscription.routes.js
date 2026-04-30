import { Router } from "express";
import { createOrder, verifyPayment, getSubscriptionStatus } from "./subscription.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

const subscriptionRouter = Router();

subscriptionRouter.post("/create-order", authMiddleware, createOrder);
subscriptionRouter.post("/verify-payment", authMiddleware, verifyPayment);
subscriptionRouter.get("/status", authMiddleware, getSubscriptionStatus);

export default subscriptionRouter;
