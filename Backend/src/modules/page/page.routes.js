import { Router } from "express";
import { getPage, getPageList, upsertPage } from "./page.controller.js";
import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";

const pageRouter = Router();

// Public Routes
pageRouter.route("/:slug").get(getPage);
pageRouter.route("/").get(getPageList);

// Admin/Owner Routes
pageRouter.route("/:slug").post(authMiddleware, authorizeRoles('owner'), upsertPage);

export default pageRouter;
