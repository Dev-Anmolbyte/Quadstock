import express from 'express';
import { addProduct, getProducts, updateProduct, deleteProduct } from "../controllers/productController.js";
import { upload } from "../middlewares/multer.js";

const productRouter = express.Router();

// Routes
productRouter.post("/add", upload.single("imageFile"), addProduct); // Handle single image file upload
productRouter.get("/all", getProducts); // Fetch all products for an owner
productRouter.put("/update/:id", updateProduct); // Update product by ID
productRouter.delete("/delete/:id", deleteProduct); // Delete product by ID

export default productRouter;
