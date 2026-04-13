import { Router } from "express";
import { 
    requestLeave, 
    getMyLeaves, 
    getAllLeaves, 
    updateLeaveStatus 
} from "./leave.controller.js";
import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";

const leaveRouter = Router();

leaveRouter.use(authMiddleware);

leaveRouter.route("/")
    .post(requestLeave)
    .get(getMyLeaves);

// Owner routes
leaveRouter.get("/admin/all", authorizeRoles("owner"), getAllLeaves);
leaveRouter.patch("/:id/status", authorizeRoles("owner"), updateLeaveStatus);

export default leaveRouter;
