import { Router } from "express";
import { addCategory, getCategories, updateCategory, deleteCategory } from "./category.controller.js";
import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";

const categoryRouter = Router();

// Store isolation check at the point of access in controller, but auth required everywhere
categoryRouter.use(authMiddleware);

categoryRouter.post("/", authorizeRoles("owner"), addCategory);
categoryRouter.get("/", getCategories);
categoryRouter.put("/:id", authorizeRoles("owner"), updateCategory);
categoryRouter.delete("/:id", authorizeRoles("owner"), deleteCategory);

export default categoryRouter;
