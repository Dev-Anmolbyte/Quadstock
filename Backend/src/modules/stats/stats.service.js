import { User } from "../user/user.model.js";
import { Product } from "../product/product.model.js";
import { Udhaar } from "../udhaar/udhaar.model.js";
import { Inventory } from "../product/inventory.model.js";
import { SmartExpiry } from "../product/smartExpiry.model.js";
import { Store } from "../store/store.model.js";
import { Order } from "../order/order.model.js";
import { withStore } from "../../utils/storeHelper.js";
import { StoreStats } from "./storeStats.model.js";
import { Employee } from "../employee/employee.model.js";

class StatsService {
    async updateMonthlyStats(storeId, type, amount, dateStr) {
        if (!storeId || !amount) return;
        
        const date = dateStr ? new Date(dateStr) : new Date();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        const updateData = {};
        if (type === 'sale') {
            updateData.$inc = { totalRevenue: amount };
        } else if (type === 'payment') {
            updateData.$inc = { totalRecovered: amount };
        } else if (type === 'taken') {
            updateData.$inc = { totalUdhaarIssued: amount };
        }
        
        updateData.$set = { lastUpdatedValue: new Date() };

        return await StoreStats.findOneAndUpdate(
            { storeId, month, year },
            updateData,
            { upsert: true, returnDocument: 'after' }
        );
    }
    async getPublicStats() {
        const totalStores = await User.countDocuments({ role: 'owner' });
        const totalProducts = await Product.countDocuments();
        const totalTransactions = await Udhaar.countDocuments();
        
        return {
            totalStores: totalStores || 0,
            totalProducts: totalProducts || 0,
            totalTransactions: totalTransactions || 0,
            timeSavedPercent: 45
        };
    }

    async getOwnerStats(storeId, month, year) {
        const filter = withStore({}, { storeId });
        const now = new Date();
        now.setHours(0,0,0,0);

        // Parse month/year for filtering (default to current if not provided)
        const targetMonth = parseInt(month) || (now.getMonth() + 1);
        const targetYear = parseInt(year) || now.getFullYear();

        const store = await Store.findById(storeId);
        const lowThreshold = store?.lowStockThreshold || 10;

        // 1. Inventory & Products
        // We need both to get names and images, but quantity from inventory
        const inventory = await Inventory.find(filter).populate("productId");
        const products = await Product.find(filter);
        
        const totalStockValue = inventory.reduce((acc, item) => acc + ((item.cp || 0) * (item.quantity || 0)), 0);
        const lowStockCount = inventory.filter(item => item.quantity > 0 && item.quantity <= (item.reorderPoint || lowThreshold)).length;
        const outOfStockCount = inventory.filter(item => item.quantity === 0).length;

        // 2. Smart Expiry Stats (Live date-based calculation)
        const expiryThreshold = store?.healthyExpiryThreshold || 30;
        const expiryDateLimit = new Date(now);
        expiryDateLimit.setDate(expiryDateLimit.getDate() + expiryThreshold);

        const expiringSoonCount = await SmartExpiry.countDocuments({ 
            ...filter, 
            expiryDate: { $gte: now, $lte: expiryDateLimit },
            quantity: { $gt: 0 } // Only count if still in stock
        });
        const expiredCount = await SmartExpiry.countDocuments({ 
            ...filter, 
            expiryDate: { $lt: now },
            quantity: { $gt: 0 } // Only count if still in stock
        });
        const expiringSoonList = await SmartExpiry.find({ 
            ...filter, 
            expiryDate: { $gte: now, $lte: expiryDateLimit },
            quantity: { $gt: 0 }
        })
            .populate("productId", "name brand image")
            .limit(6)
            .sort({ expiryDate: 1 });

        const expiredList = await SmartExpiry.find({ 
            ...filter, 
            expiryDate: { $lt: now },
            quantity: { $gt: 0 }
        })
            .populate("productId", "name brand image")
            .limit(6)
            .sort({ expiryDate: 1 });

        // 3. Udhaar Stats & Chart Trends
        const udhaarRecords = await Udhaar.find(filter);
        const totalUdhaarPending = udhaarRecords.reduce((acc, u) => acc + (u.balance || 0), 0);
        
        // Calculate Top Debtors
        const topDebtors = [...udhaarRecords]
            .filter(u => u.balance > 0)
            .sort((a, b) => b.balance - a.balance)
            .slice(0, 5)
            .map(u => ({ name: u.name, balance: u.balance }));

        // Fetch pre-calculated stats for performance
        const monthlyStat = await StoreStats.findOne({ storeId, month: targetMonth, year: targetYear });

        let totalRevenue = monthlyStat ? monthlyStat.totalRevenue : 0; 
        let totalRecovered = monthlyStat ? monthlyStat.totalRecovered : 0;
        
        // Fetch orders for total fallback and trend chart
        const orders = await Order.find(filter);
        if (!monthlyStat) {
            totalRevenue = orders.filter(o => {
                const d = new Date(o.createdAt);
                return (d.getMonth() + 1) === targetMonth && d.getFullYear() === targetYear;
            }).reduce((acc, o) => acc + (o.totalAmount || 0), 0);
        }

        // Dynamic Chart Trends (Last 7 Days)
        const labels = [];
        const revenueData = [0, 0, 0, 0, 0, 0, 0]; // Now based on Orders
        const creditData = [0, 0, 0, 0, 0, 0, 0];  // Based on Udhaar Taken
        
        for (let i = 6; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            labels.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
        }

        // Populate revenueData from Orders
        orders.forEach(o => {
            const oDate = new Date(o.createdAt);
            for (let i = 0; i < 7; i++) {
                const targetDate = new Date();
                targetDate.setDate(targetDate.getDate() - (6 - i));
                
                if (oDate.getDate() === targetDate.getDate() && 
                    oDate.getMonth() === targetDate.getMonth() && 
                    oDate.getFullYear() === targetDate.getFullYear()) {
                    revenueData[i] += o.totalAmount || 0;
                }
            }
        });

        // Use udhaarRecords only for credit taken and manual totalRecovered fallback
        udhaarRecords.forEach(u => {
            if (u.transactions && Array.isArray(u.transactions)) {
                u.transactions.forEach(tx => {
                    if (!tx.date) return;
                    const txDate = new Date(tx.date);
                    
                    if (!monthlyStat && tx.type === 'payment' && (txDate.getMonth() + 1) === targetMonth && txDate.getFullYear() === targetYear) {
                        totalRecovered += tx.amount || 0;
                    }
                    
                    for (let i = 0; i < 7; i++) {
                        const targetDate = new Date();
                        targetDate.setDate(targetDate.getDate() - (6 - i));
                        
                        if (txDate.getDate() === targetDate.getDate() && 
                            txDate.getMonth() === targetDate.getMonth() && 
                            txDate.getFullYear() === targetDate.getFullYear()) {
                            if (tx.type === 'taken') creditData[i] += tx.amount || 0;
                        }
                    }
                });
            }
        });

        const trends = { labels, revenueData, creditData };

        // 4. User (Staff) Stats
        const totalUsers = await Employee.countDocuments(filter);

        // 5. Ranking calculations
        const topProducts = inventory
            .filter(item => item.quantity > 0)
            .map(item => ({
                name: item.productId?.name || 'Unknown',
                image: item.productId?.image || null,
                quantity: item.quantity,
                price: item.price,
                totalValue: (item.price || 0) * (item.quantity || 0)
            }))
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 6);

        const outOfStockList = inventory
            .filter(item => item.quantity === 0)
            .map(item => ({
                name: item.productId?.name || 'Unknown',
                image: item.productId?.image || null
            }))
            .slice(0, 6);

        const lowStockList = inventory
            .filter(item => item.quantity > 0 && item.quantity <= (item.reorderPoint || lowThreshold))
            .map(item => ({
                name: item.productId?.name || 'Unknown',
                quantity: item.quantity,
                image: item.productId?.image || null
            }))
            .sort((a, b) => a.quantity - b.quantity)
            .slice(0, 6);

        const highStockList = inventory
            .filter(item => item.quantity > (item.reorderPoint || lowThreshold) * 3) // Arbitrary high stock logic
            .map(item => ({
                name: item.productId?.name || 'Unknown',
                quantity: item.quantity,
                image: item.productId?.image || null
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 6);

        const deadStockList = inventory
            .filter(item => item.quantity > 0) // Cannot track inactivity yet since no POS exist, mocking empty
            .slice(0, 0);

        return {
            totalItems: products.length,
            totalStockValue,
            totalRevenue,
            totalRecovered,
            lowStockCount,
            lowStockList,
            highStockList,
            deadStockList,
            outOfStockCount,
            expiringSoonCount,
            expiredCount,
            totalUdhaarPending,
            topDebtors,
            trends,
            totalUsers,
            topProducts,
            refreshAt: new Date().toISOString(),
            expiringSoonList: expiringSoonList.map(item => ({
                name: item.productId?.name,
                exp: item.expiryDate.toISOString().split('T')[0],
                daysLeft: Math.ceil((item.expiryDate - now) / (1000 * 60 * 60 * 24))
            })),
            expiredList: expiredList.map(item => ({
                name: item.productId?.name,
                exp: item.expiryDate.toISOString().split('T')[0],
                daysPast: Math.ceil((now - item.expiryDate) / (1000 * 60 * 60 * 24))
            })),
            outOfStockList,
            bestSellers: topProducts,
            settings: {
                notifLowStock: store?.notifLowStock ?? true,
                notifUdhaarOverdue: store?.notifUdhaarOverdue ?? true,
                notifPaymentReminders: store?.notifPaymentReminders ?? false
            }
        };
    }
}

export default new StatsService();
