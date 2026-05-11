import { Router } from "express";
import { addCategory, getCategories, updateCategory, deleteCategory } from "./category.controller.js";
import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";

const categoryRouter = Router();

// Store isolation check at the point of access in controller, but auth required everywhere
categoryRouter.use(authMiddleware);

categoryRouter.post("/", authorizeRoles("owner", "inventory_manager"), addCategory);
categoryRouter.get("/", getCategories);
categoryRouter.put("/:id", authorizeRoles("owner", "inventory_manager"), updateCategory);
categoryRouter.delete("/:id", authorizeRoles("owner", "inventory_manager"), deleteCategory);

export default categoryRouter;
