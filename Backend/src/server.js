import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from "./config/db.js";
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoute.js';
import productRouter from './routes/productRoute.js';
import udhaarRouter from './routes/udhaarRoute.js';
import statsRouter from './routes/statsRoute.js';
import complaintRouter from './routes/complaintRoute.js';

// App config
const app = express();
const port = process.env.PORT || 4000;
connectDB();
connectCloudinary();

// Middlewares
app.use(cors());
app.use(express.json());

// API Endpoints
// Routes declaration
app.use("/api/owner", userRouter);
app.use("/api/inventory", productRouter);
app.use("/api/udhaar", udhaarRouter);
app.use("/api/stats", statsRouter);
app.use("/api/complaints", complaintRouter);

app.get("/", (req, res) => {
    res.send("API is running...");
});

// Listener
app.listen(port, () => console.log(`Server is running on port: ${port}`));