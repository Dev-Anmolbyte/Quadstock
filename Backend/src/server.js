import "dotenv/config";
import app from './app.js';
import connectDB from "./config/db.js";
import connectCloudinary from './config/cloudinary.js';

// Connect Services
connectDB();
connectCloudinary();

const port = process.env.PORT || 4000;

// Listener
app.listen(port, () => console.log(`Server is running on port: ${port}`));