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

const applyDiscount = asyncHandler(async (req, res) => {
    // Determine if it's bulk or single item
    const id = req.params.id;
    const { productIds, discount, discountType, reason } = req.body;
    
    // Validate request
    if (discount === undefined || discount < 0) {
        throw new ApiError(400, "Valid discount amount is required");
    }

    const idsToUpdate = id ? [id] : productIds;
    
    if (!idsToUpdate || idsToUpdate.length === 0) {
        throw new ApiError(400, "Product ID(s) required");
    }

    const updatedProducts = await productService.applyDiscount(
        idsToUpdate, 
        req.user.storeId, 
        { discount, discountType: discountType || 'percentage', reason },
        req.user // pass user to log who applied it
    );
    
    return res.status(200).json({
        success: true,
        data: updatedProducts,
        message: "Discount applied successfully"
    });
});

const getSmartExpiry = asyncHandler(async (req, res) => {
    const data = await productService.getSmartExpiryRecords(req.user.storeId, req.query);
    return res.status(200).json({
        success: true,
        data: data.records,
        meta: { 
            total: data.total, 
            page: data.page, 
            pages: data.pages 
        }
    });
});

export {
    addProduct,
    getProducts,
    updateProduct,
    deleteProduct,
    applyDiscount,
    getSmartExpiry
};
