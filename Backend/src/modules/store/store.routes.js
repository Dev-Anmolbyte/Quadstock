import { Router } from "express";
import { getStoreDetails, updateStore } from "./store.controller.js";
import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";

const storeRouter = Router();

storeRouter.use(authMiddleware);

storeRouter.get("/details", getStoreDetails);
storeRouter.put("/update", authorizeRoles("owner"), updateStore);

export default storeRouter;
