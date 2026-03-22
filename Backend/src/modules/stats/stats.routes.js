import { Router } from "express";
import { getPublicStats, getOwnerStats } from "./stats.controller.js";
import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";

const statsRouter = Router();

statsRouter.get("/public", getPublicStats);
statsRouter.get("/owner", authMiddleware, authorizeRoles("owner"), getOwnerStats);

export default statsRouter;
