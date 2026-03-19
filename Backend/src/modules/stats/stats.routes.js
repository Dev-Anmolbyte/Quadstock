import { Router } from "express";
import { getPublicStats, getOwnerStats } from "./stats.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

const statsRouter = Router();

statsRouter.get("/public", getPublicStats);
statsRouter.get("/owner", authMiddleware, getOwnerStats);

export default statsRouter;
