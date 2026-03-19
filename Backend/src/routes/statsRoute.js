import express from 'express';
import { getPublicStats, getOwnerStats } from "../controllers/statsController.js";

const statsRouter = express.Router();

// Routes
statsRouter.get("/public", getPublicStats); 
statsRouter.get("/owner", getOwnerStats); 

export default statsRouter;
