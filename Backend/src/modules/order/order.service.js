import { Order } from "./order.model.js";
import { Product } from "../product/product.model.js";
import { Inventory } from "../product/inventory.model.js";
import { ApiError } from "../../utils/ApiError.js";
import statsService from "../stats/stats.service.js";

class OrderService {
    async createOrder(orderData, storeId, employeeId = null) {
        const { items, total, paymentMethod } = orderData;

        // Start Transaction (if DB supports it, else manual rollback logic)
        // For now, let's do safe sequential updates.
        
        const processedItems = [];
        for (const item of items) {
            const product = await Product.findOne({ _id: item.productId, storeId });
            if (!product) throw new ApiError(404, `Product ${item.productId} not found`);

            if (item.productType === 'packed') {
                if (product.quantity < item.quantity) {
                    throw new ApiError(400, `Insufficient stock for ${product.name}`);
                }
                product.quantity -= item.quantity;
            } else {
                if (product.stockQuantity < item.quantity) {
                    throw new ApiError(400, `Insufficient loose stock for ${product.name}`);
                }
                product.stockQuantity -= item.quantity;
            }

            await product.save();

            // Also update Inventory record (latest batch)
            const inventory = await Inventory.findOne({ productId: product._id, storeId }).sort({ createdAt: -1 });
            if (inventory) {
                inventory.quantity -= item.quantity;
                await inventory.save();
            }

            processedItems.push({
                productId: item.productId,
                productType: item.productType,
                quantity: item.quantity,
                price: item.price,
                total: item.total,
                unit: item.unit
            });
        }

        const order = await Order.create({
            storeId,
            employeeId,
            items: processedItems,
            totalAmount: total,
            paymentMethod: paymentMethod || 'cash'
        });
        
        // Sync to StoreStats
        await statsService.updateMonthlyStats(storeId, 'sale', total, order.createdAt);

        return order;
    }

    async getOrders(storeId, query = {}) {
        const { status, limit = 50, employeeId } = query;
        const filter = { storeId };
        if (status) filter.status = status;
        if (employeeId) filter.employeeId = employeeId;

        return await Order.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));
    }

    async getEmployeeSalesSummary(employeeId, storeId, month) {
        // month: "YYYY-MM"
        const filter = {
            employeeId,
            storeId,
            createdAt: {
                $gte: new Date(`${month}-01`),
                $lt: new Date(new Date(`${month}-01`).setMonth(new Date(`${month}-01`).getMonth() + 1))
            }
        };

        const orders = await Order.find(filter);
        const totalSales = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        
        return {
            count: orders.length,
            totalSales,
            month
        };
    }
}


export default new OrderService();
