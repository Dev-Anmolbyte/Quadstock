import productService from "./product.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";

const addProduct = asyncHandler(async (req, res) => {
    const product = await productService.createProduct(req.body, req.user.storeId, req.file);
    return res.status(201).json({
        success: true,
        data: product,
        message: "Product added successfully"
    });
});

const getProducts = asyncHandler(async (req, res) => {
    const { products, total, page, pages } = await productService.getProducts(req.user.storeId, req.query);
    return res.status(200).json({
        success: true,
        data: products,
        meta: { total, page, pages }
    });
});

const updateProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const product = await productService.updateProduct(id, req.user.storeId, req.body, req.file);
    return res.status(200).json({
        success: true,
        data: product,
        message: "Product updated successfully"
    });
});

const deleteProduct = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await productService.deleteProduct(id, req.user.storeId);
    return res.status(200).json({
        success: true,
        message: "Product deleted successfully"
    });
});

export {
    addProduct,
    getProducts,
    updateProduct,
    deleteProduct
};
