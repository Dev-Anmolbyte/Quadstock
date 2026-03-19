import categoryService from "./category.service.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";

const addCategory = asyncHandler(async (req, res) => {
    const category = await categoryService.createCategory(req.body, req.user.storeId);
    return res.status(201).json({
        success: true,
        data: category,
        message: "Category added successfully"
    });
});

const getCategories = asyncHandler(async (req, res) => {
    const categories = await categoryService.getCategories(req.user.storeId);
    return res.status(200).json({
        success: true,
        data: categories
    });
});

const updateCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const category = await categoryService.updateCategory(id, req.user.storeId, name);
    return res.status(200).json({
        success: true,
        data: category,
        message: "Category updated successfully"
    });
});

const deleteCategory = asyncHandler(async (req, res) => {
    const { id } = req.params;
    await categoryService.deleteCategory(id, req.user.storeId);
    return res.status(200).json({
        success: true,
        message: "Category deleted successfully"
    });
});

export {
    addCategory,
    getCategories,
    updateCategory,
    deleteCategory
};
