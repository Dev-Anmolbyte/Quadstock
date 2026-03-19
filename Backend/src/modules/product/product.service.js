import { Product } from "./product.model.js";
import { Category } from "../category/category.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js";

class ProductService {
    async createProduct(productData, storeId, file) {
        const { name, categoryId, categoryName, ...rest } = productData;

        let finalCategoryId = categoryId;

        // If no categoryId, but name is provided, find or create it
        if (!finalCategoryId && categoryName) {
            let cat = await Category.findOne({ name: categoryName.trim(), storeId });
            if (!cat) {
                cat = await Category.create({ name: categoryName.trim(), storeId });
            }
            finalCategoryId = cat._id;
        }

        if (!finalCategoryId) throw new ApiError(400, "Category is required");

        let imageUrl = null;
        if (file) {
            const upload = await uploadOnCloudinary(file.path);
            if (upload) imageUrl = upload.url;
        }

        return await Product.create({
            ...rest,
            name,
            categoryId: finalCategoryId,
            storeId,
            image: imageUrl
        });
    }

    async getProducts(storeId, query = {}) {
        const { page = 1, limit = 10, search, categoryId } = query;
        const skip = (page - 1) * limit;

        const filter = { storeId };
        if (search) {
            filter.name = { $regex: search, $options: 'i' };
        }
        if (categoryId) {
            filter.categoryId = categoryId;
        }

        const total = await Product.countDocuments(filter);
        const products = await Product.find(filter)
            .populate("categoryId", "name")
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        return {
            products,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        };
    }

    async updateProduct(id, storeId, updates, file) {
        const product = await Product.findOne({ _id: id, storeId });
        if (!product) throw new ApiError(404, "Product not found");

        if (file) {
            const upload = await uploadOnCloudinary(file.path);
            if (upload) updates.image = upload.url;
        }

        Object.assign(product, updates);
        return await product.save();
    }

    async deleteProduct(id, storeId) {
        const product = await Product.findOneAndDelete({ _id: id, storeId });
        if (!product) throw new ApiError(404, "Product not found");
        return product;
    }
}

export default new ProductService();
