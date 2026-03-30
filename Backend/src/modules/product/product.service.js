import { Product } from "./product.model.js";
import { Category } from "../category/category.model.js";
import { SmartExpiry } from "./smartExpiry.model.js";
import { Inventory } from "./inventory.model.js";
import { ApiError } from "../../utils/ApiError.js";
import { uploadOnCloudinary } from "../../utils/cloudinary.js";
import { withStore } from "../../utils/storeHelper.js";

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

        let imageUrl = rest.image || null;
        if (file) {
            const upload = await uploadOnCloudinary(file.path);
            if (upload) imageUrl = upload.url;
        }

        const product = await Product.create({
            name,
            brand: rest.brand,
            type: rest.type,
            categoryId: finalCategoryId,
            storeId,
            image: imageUrl,
            description: rest.description,
            barcode: rest.barcode,
            unit: rest.unit || 'pcs'
        });

        // Create Inventory record for this batch
        const inventory = await Inventory.create({
            productId: product._id,
            storeId,
            batchNumber: rest.batchNumber || `BAT-${Date.now()}`,
            quantity: rest.quantity || 0,
            unit: rest.unit || 'pcs',
            mfd: rest.mfd,
            exp: rest.exp,
            pp: rest.pp || 0,
            cp: rest.cp || 0,
            price: rest.price || 0,
            reorderPoint: rest.reorderPoint || 10
        });

        // Trigger Smart Expiry if exp date exists
        if (inventory.exp) {
            await this.updateSmartExpiry(inventory, storeId);
        }

        return { ...product.toObject(), ...inventory.toObject(), id: product._id };
    }

    async getProducts(storeId, query = {}) {
        const { page = 1, limit = 10, search, categoryId } = query;
        const skip = (page - 1) * limit;

        const filter = withStore({}, { storeId });
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

        const mappedProducts = products.map(p => {
            const productObj = p.toObject();
            return {
                ...productObj,
                id: productObj._id,
                categoryName: p.categoryId?.name || ''
            };
        });

        return {
            products: mappedProducts,
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        };
    }

    async updateProduct(id, storeId, updates, file) {
        const product = await Product.findOne(withStore({ _id: id }, { storeId }));
        if (!product) throw new ApiError(404, "Product not found");

        if (file) {
            const upload = await uploadOnCloudinary(file.path);
            if (upload) updates.image = upload.url;
        }

        const { categoryName, ...otherUpdates } = updates;
        let finalCategoryId = otherUpdates.categoryId;

        // Handle categoryName find-or-create logic
        if (!finalCategoryId && categoryName) {
            let cat = await Category.findOne({ name: categoryName.trim(), storeId });
            if (!cat) {
                cat = await Category.create({ name: categoryName.trim(), storeId });
            }
            finalCategoryId = cat._id;
        }

        if (finalCategoryId) {
            product.categoryId = finalCategoryId;
        }

        // Separate Product updates from Inventory updates
        const productFields = ['name', 'brand', 'type', 'description', 'barcode', 'image', 'unit'];
        const inventoryFields = ['batchNumber', 'quantity', 'unit', 'mfd', 'exp', 'pp', 'cp', 'price', 'reorderPoint'];

        const productUpdates = {};
        const inventoryUpdates = {};

        Object.keys(otherUpdates).forEach(key => {
            if (productFields.includes(key)) productUpdates[key] = otherUpdates[key];
            if (inventoryFields.includes(key)) inventoryUpdates[key] = otherUpdates[key];
        });

        Object.assign(product, productUpdates);
        await product.save();

        // Update Inventory record (Primary batch)
        let inventory = await Inventory.findOne({ productId: product._id, storeId }).sort({ createdAt: -1 });
        if (inventory) {
            Object.assign(inventory, inventoryUpdates);
            await inventory.save();
        } else if (Object.keys(inventoryUpdates).length > 0) {
            inventory = await Inventory.create({ 
                productId: product._id, 
                storeId, 
                ...inventoryUpdates 
            });
        }

        // Update Smart Expiry if inventory has exp
        if (inventory && inventory.exp) {
            await this.updateSmartExpiry(inventory, storeId);
        }

        return { ...product.toObject(), ...(inventory?.toObject() || {}), id: product._id };
    }

    async deleteProduct(id, storeId) {
        const product = await Product.findOneAndDelete(withStore({ _id: id }, { storeId }));
        if (!product) throw new ApiError(404, "Product not found");
        // Also delete associated inventory and expiry records
        await Inventory.deleteMany({ productId: id, storeId });
        await SmartExpiry.deleteMany({ productId: id, storeId });
        return product;
    }

    async applyDiscount(ids, storeId, { discount, discountType, reason }, user) {
        const updateData = {
            $set: { discount, discountType },
            $push: {
                discountHistory: {
                    amount: discount,
                    type: discountType,
                    reason: reason || "Smart Expiry Adjustment",
                    appliedBy: user.name || user.username || "Staff",
                    date: new Date()
                }
            }
        };

        const result = await Product.updateMany(
            { _id: { $in: ids }, storeId },
            updateData
        );

        if (result.matchedCount === 0) {
            throw new ApiError(404, "No matching products found");
        }

        // Return the updated products if needed, or just success
        return await Product.find({ _id: { $in: ids }, storeId });
    }

    async updateSmartExpiry(inventory, storeId) {
        if (!inventory || !inventory.exp) return;

        // Fetch store settings for thresholds
        const store = await Store.findById(storeId);
        const threshold = store?.healthyExpiryThreshold || 30;

        const expiryDate = new Date(inventory.exp);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = expiryDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        let status = 'safe';
        if (diffDays < 0) status = 'expired';
        else if (diffDays <= threshold) status = 'expiring';

        // Upsert smart expiry record
        await SmartExpiry.findOneAndUpdate(
            { productId: inventory.productId, storeId, batchNumber: inventory.batchNumber },
            {
                expiryDate,
                quantity: inventory.quantity,
                status,
                storeId
            },
            { upsert: true, new: true }
        );
    }

    async getSmartExpiryRecords(storeId, query = {}) {
        const { status, page = 1, limit = 10 } = query;
        const filter = { storeId };
        if (status) filter.status = status;

        const skip = (page - 1) * limit;
        const total = await SmartExpiry.countDocuments(filter);
        const records = await SmartExpiry.find(filter)
            .populate("productId", "name brand image batchNumber")
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ expiryDate: 1 });

        return {
            records: records.map(r => ({
                ...r.toObject(),
                id: r._id,
                productName: r.productId?.name || 'Unknown Product'
            })),
            total,
            page: parseInt(page),
            pages: Math.ceil(total / limit)
        };
    }
}

export default new ProductService();
