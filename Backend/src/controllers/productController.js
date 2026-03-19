import { Product } from "../models/productModel.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

const addProduct = async (req, res) => {
    try {
        const productData = req.body;

        if (!productData.ownerId || !productData.name) {
            return res.status(400).json({ success: false, message: "Owner ID and Product Name are required" });
        }

        // Handle Image Upload if local path provided from multer (once integrated)
        let imageUrl = productData.image || "";
        if (req.file) {
            const uploadResult = await uploadOnCloudinary(req.file.path);
            if (uploadResult) {
                imageUrl = uploadResult.url;
            }
        }

        const product = await Product.create({
            ...productData,
            image: imageUrl
        });

        if (!product) {
            return res.status(500).json({ success: false, message: "Failed to create product" });
        }

        return res.status(201).json({
            success: true,
            data: product,
            message: "Product added successfully"
        });

    } catch (error) {
        console.error("Add Product Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getProducts = async (req, res) => {
    try {
        const { ownerId } = req.query;

        if (!ownerId) {
            return res.status(400).json({ success: false, message: "Owner ID is required" });
        }

        const products = await Product.find({ ownerId }).sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            data: products || []
        });

    } catch (error) {
        console.error("Get Products Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const product = await Product.findByIdAndUpdate(
            id,
            { $set: updates },
            { new: true }
        );

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        return res.status(200).json({
            success: true,
            data: product,
            message: "Product updated successfully"
        });

    } catch (error) {
        console.error("Update Product Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;

        const product = await Product.findByIdAndDelete(id);

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        return res.status(200).json({
            success: true,
            message: "Product deleted successfully"
        });

    } catch (error) {
        console.error("Delete Product Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

export {
    addProduct,
    getProducts,
    updateProduct,
    deleteProduct
}
