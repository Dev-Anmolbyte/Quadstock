import { Router } from "express";
import { createOrder, getOrders, getMySales, getEmployeeSales } from "./order.controller.js";

import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";

const router = Router();

// Secure all order routes
router.use(authMiddleware);

router.route("/")
    .post(createOrder)
    .get(getOrders);

router.get("/my-sales", getMySales);
router.get("/employee/:id", authorizeRoles("owner"), getEmployeeSales);

export default router;

