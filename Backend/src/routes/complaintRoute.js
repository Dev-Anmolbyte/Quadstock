import express from 'express';
import { addComplaint, getComplaintsByOwner, updateStatus, addReply, deleteComplaint } from "../controllers/complaintController.js";

const complaintRouter = express.Router();

complaintRouter.post("/add", addComplaint);
complaintRouter.get("/all", getComplaintsByOwner);
complaintRouter.patch("/status/:id", updateStatus);
complaintRouter.post("/reply/:id", addReply);
complaintRouter.delete("/delete/:id", deleteComplaint);

export default complaintRouter;
