import { Router } from "express";
import { addQuery, getQueries, updateStatus, addReply, deleteQuery } from "./query.controller.js";
import { authMiddleware, authorizeRoles } from "../../middleware/auth.middleware.js";

const queryRouter = Router();

queryRouter.use(authMiddleware);

queryRouter.route("/")
    .post(addQuery)
    .get(getQueries);

queryRouter.route("/:id")
    .patch(authorizeRoles("owner"), updateStatus)
    .delete(deleteQuery);

queryRouter.post("/:id/reply", addReply);

export default queryRouter;
