import { Category } from "./category.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { withStore } from "../../utils/storeHelper.js";

class CategoryService {
    async createCategory(categoryData, storeId) {
        const { name } = categoryData;
        if (!name) throw new ApiError(400, "Category name is required");

        const existed = await Category.findOne({ name: name.trim(), storeId });
        if (existed) return existed; // If exists for this store, just return

        return await Category.create({ name: name.trim(), storeId });
    }

    async getCategories(storeId, query = {}) {
        const { page = 1, limit = 50 } = query;
        const skip = (page - 1) * limit;

        const filter = withStore({}, { storeId });
        const total = await Category.countDocuments(filter);
        const categories = await Category.find(filter)
            .sort({ name: 1 })
            .skip(skip)
            .limit(parseInt(limit));

        return {
            categories,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        };
    }

    async updateCategory(id, storeId, name) {
        const category = await Category.findOneAndUpdate(
            withStore({ _id: id }, { storeId }),
            { name: name.trim() },
            { returnDocument: 'after' }
        );
        if (!category) throw new ApiError(404, "Category not found");
        return category;
    }

    async deleteCategory(id, storeId) {
        const deleted = await Category.findOneAndDelete(withStore({ _id: id }, { storeId }));
        if (!deleted) throw new ApiError(404, "Category not found");
    }
}

export default new CategoryService();
