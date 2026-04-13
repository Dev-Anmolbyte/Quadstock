import { Router } from "express";
import { getStoreDetails, updateStore, getNotificationSummary } from "./store.controller.js";
import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";

const storeRouter = Router();

storeRouter.use(authMiddleware);

storeRouter.get("/details", getStoreDetails);
storeRouter.get("/notifications", getNotificationSummary);
storeRouter.put("/update", authorizeRoles("owner"), updateStore);

// Master Actions
storeRouter.get("/export-data", authorizeRoles("owner"), (req, res, next) => {
    // Controller implementation will be imported/added
    import("./store.controller.js").then(c => c.exportStoreData(req, res, next));
});

storeRouter.delete("/reset-data", authorizeRoles("owner"), (req, res, next) => {
    import("./store.controller.js").then(c => c.resetStoreData(req, res, next));
});

export default storeRouter;
