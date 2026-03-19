import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cookieParser from 'cookie-parser';
import 'dotenv/config';

import validateEnv from './config/env.js';
import userRouter from './modules/user/user.routes.js';
import storeRouter from './modules/store/store.routes.js';
import productRouter from './modules/product/product.routes.js';
import udhaarRouter from './modules/udhaar/udhaar.routes.js';
import statsRouter from './modules/stats/stats.routes.js';
import complaintRouter from './modules/complaint/complaint.routes.js';
import categoryRouter from './modules/category/category.routes.js';
import { errorHandler } from './middleware/error.middleware.js';

// Environment Validation
validateEnv();

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN || "*",
    credentials: true
}));
app.use(express.json({ limit: '16kb' }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static("public"));
app.use(cookieParser());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, 
    max: 100,
    message: "Too many requests from this IP, please try again after 15 minutes",
});
app.use("/api", limiter);

// API Endpoints (Clean REST + Modular)
app.use("/api/users", userRouter);
app.use("/api/stores", storeRouter);
app.use("/api/products", productRouter);
app.use("/api/udhaar", udhaarRouter);
app.use("/api/stats", statsRouter);
app.use("/api/complaints", complaintRouter);
app.use("/api/categories", categoryRouter);

app.get("/", (req, res) => {
    res.status(200).send("API is running...");
});

// Global Error Handler
app.use(errorHandler);

export default app;
