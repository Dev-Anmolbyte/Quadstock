import { Router } from "express";
import { createOrder, getOrders } from "./order.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

const router = Router();

// Secure all order routes
router.use(authMiddleware);

router.route("/")
    .post(createOrder)
    .get(getOrders);

export default router;
