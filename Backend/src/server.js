import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import dotenv from "dotenv";
dotenv.config();
import connectDB from "./config/db.js";
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoute.js';
import mongoose from "mongoose";
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.log("MONGODB connection FAILED:", err));


// App config
const app = express();
const port = process.env.PORT || 5000;
connectDB();
connectCloudinary();

// Middlewares
app.use(cors());
app.use(express.json());

// API Endpoints
app.use("/api/owner", userRouter);

app.get('/', (req, res) => res.send('Hello from Quadstock Backend!'));

// Listener
app.listen(port, () => console.log(`Server is running on port: ${port}`));