import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import connectDB from "./config/db.js";
import connectCloudinary from './config/cloudinary.js';
import userRouter from './routes/userRoute.js';

// App config
const app = express();
const port = process.env.PORT || 4000;
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