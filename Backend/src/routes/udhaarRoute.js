import express from 'express';
import { addUdhaarRecord, getUdhaarRecords, updatePayment, deleteUdhaarRecord } from "../controllers/udhaarController.js";

const udhaarRouter = express.Router();

// Routes
udhaarRouter.post("/add", addUdhaarRecord); 
udhaarRouter.get("/all", getUdhaarRecords); 
udhaarRouter.patch("/payment/:id", updatePayment); // Update specific record's payment
udhaarRouter.delete("/delete/:id", deleteUdhaarRecord); 

export default udhaarRouter;
