import { Category } from "./category.model.js";
import { ApiError } from "../../utils/ApiError.js";

class CategoryService {
    async createCategory(categoryData, storeId) {
        const { name } = categoryData;
        if (!name) throw new ApiError(400, "Category name is required");

        const existed = await Category.findOne({ name: name.trim(), storeId });
        if (existed) return existed; // If exists for this store, just return

        return await Category.create({ name: name.trim(), storeId });
    }

    async getCategories(storeId) {
        return await Category.find({ storeId }).sort({ name: 1 });
    }

    async updateCategory(id, storeId, name) {
        const category = await Category.findOneAndUpdate(
            { _id: id, storeId },
            { name: name.trim() },
            { new: true }
        );
        if (!category) throw new ApiError(404, "Category not found");
        return category;
    }

    async deleteCategory(id, storeId) {
        const deleted = await Category.findOneAndDelete({ _id: id, storeId });
        if (!deleted) throw new ApiError(404, "Category not found");
    }
}

export default new CategoryService();
