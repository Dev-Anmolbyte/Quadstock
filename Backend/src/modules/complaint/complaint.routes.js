import { Router } from "express";
import { addComplaint, getComplaints, updateStatus, addReply, deleteComplaint } from "./complaint.controller.js";
import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";

const complaintRouter = Router();

// Protect all complaint routes
complaintRouter.use(authMiddleware);

complaintRouter.route("/")
    .post(addComplaint)
    .get(getComplaints);

complaintRouter.route("/:id")
    .patch(authorizeRoles("owner"), updateStatus)
    .delete(deleteComplaint);

complaintRouter.post("/:id/reply", addReply);

export default complaintRouter;
