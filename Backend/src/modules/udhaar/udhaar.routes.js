import { Router } from "express";
import { addUdhaarRecord, getUdhaarRecords, recordTransaction, deleteUdhaarRecord } from "./udhaar.controller.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";

const udhaarRouter = Router();

// RESTful Routes Protected by JWT
udhaarRouter.route("/")
    .get(authMiddleware, getUdhaarRecords)
    .post(authMiddleware, addUdhaarRecord);

udhaarRouter.route("/:id")
    .patch(authMiddleware, recordTransaction)
    .delete(authMiddleware, deleteUdhaarRecord);

export default udhaarRouter;
