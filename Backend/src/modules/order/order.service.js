import { Order } from "./order.model.js";
import { Product } from "../product/product.model.js";
import { Inventory } from "../product/inventory.model.js";
import { ApiError } from "../../utils/ApiError.js";
import statsService from "../stats/stats.service.js";

class OrderService {
    async createOrder(orderData, storeId, employeeId = null) {
        const { items, total, paymentMethod, discount, customerName, customerPhone, dueDate } = orderData;

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
            discountType: discount?.type || 'none',
            discountValue: discount?.value || 0,
            paymentMethod: paymentMethod || 'cash',
            customerName: customerName || '',
            customerPhone: customerPhone || '',
            dueDate: dueDate
        });

        // ─── UDHAAR INTEGRATION ───
        if (paymentMethod === 'udhaar') {
            if (!customerName || !customerPhone) {
                // In a real production app, we might want to throw an error here,
                // but for now let's just log it or handle gracefully.
                console.warn("[OrderService] Udhaar selected but customer info missing.");
            } else {
                try {
                    const { default: udhaarService } = await import("../udhaar/udhaar.service.js");
                    const { Udhaar } = await import("../udhaar/udhaar.model.js");
                    
                    // Always create a new record for each purchase as requested
                    await udhaarService.createRecord({
                        name: customerName,
                        contact: customerPhone,
                        totalAmount: total,
                        dueDate: dueDate, // Pass the due date
                        date: new Date().toISOString().split('T')[0],
                        description: `Purchase from Order #${order._id.toString().slice(-6).toUpperCase()}`
                    }, storeId);
                } catch (err) {
                    console.error("[OrderService] Failed to sync with Udhaar module:", err.message);
                }
            }
        }
        
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
        // Get start of current week (Monday)
        const now = new Date();
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1);
        const startOfWeek = new Date(now.setDate(diff));
        startOfWeek.setHours(0, 0, 0, 0);

        // month: "YYYY-MM"
        const monthStart = new Date(`${month}-01`);
        const monthEnd = new Date(new Date(monthStart).setMonth(monthStart.getMonth() + 1));

        const orders = await Order.find({ employeeId, storeId, createdAt: { $gte: monthStart, $lt: monthEnd } });
        
        // Filter for weekly sales (only from orders already fetched if they fit, or refetch)
        // Since we only fetched one month, we should fetch all orders for the week to be safe
        const weeklyOrders = await Order.find({
            employeeId,
            storeId,
            createdAt: { $gte: startOfWeek }
        });

        const totalSales = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        const weeklySales = weeklyOrders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
        
        return {
            count: orders.length,
            totalSales,
            weeklySales,
            month,
            orders: orders.slice(0, 10) // Limit detailed records returned
        };
    }
}



export default new OrderService();
