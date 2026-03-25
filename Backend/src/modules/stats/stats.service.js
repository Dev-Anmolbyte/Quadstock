import { User } from "../user/user.model.js";
import { Product } from "../product/product.model.js";
import { Udhaar } from "../udhaar/udhaar.model.js";

class StatsService {
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

    async getOwnerStats(storeId) {
        // 1. Inventory Stats
        const products = await Product.find({ storeId });
        
        const totalStockValue = products.reduce((acc, p) => acc + ((p.cp || 0) * (p.quantity || 0)), 0);
        const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= (p.reorderPoint || 10)).length;
        const outOfStockCount = products.filter(p => p.quantity === 0).length;

        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        
        const expiringSoonProducts = products.filter(p => {
            if (!p.exp) return false;
            const expDate = new Date(p.exp);
            return expDate > now && expDate <= thirtyDaysLater;
        });
        const expiringSoonCount = expiringSoonProducts.length;

        const expiredCount = products.filter(p => {
            if (!p.exp) return false;
            return new Date(p.exp) < now;
        }).length;

        // 2. Udhaar Stats
        const udhaarRecords = await Udhaar.find({ storeId });
        const totalUdhaarPending = udhaarRecords.reduce((acc, u) => acc + (u.balance || 0), 0);

        // 3. User (Staff) Stats
        const totalUsers = await User.countDocuments({ storeId, role: 'staff' });

        // 4. Top 4 Products (by inventory value = price * quantity)
        const topProducts = products
            .map(p => ({
                name: p.name,
                image: p.image || null,
                quantity: p.quantity,
                price: p.price,
                totalValue: (p.price || 0) * (p.quantity || 0)
            }))
            .sort((a, b) => b.totalValue - a.totalValue)
            .slice(0, 4);

        // 5. Lists for Modals
        const lowStockList = products.filter(p => p.quantity > 0 && p.quantity <= (p.reorderPoint || 10)).map(p => ({
            name: p.name,
            quantity: p.quantity,
            reorderPoint: p.reorderPoint || 10
        }));

        const deadStockDate = new Date(now.getTime() - (90 * 24 * 60 * 60 * 1000));
        const deadStockList = products.filter(p => new Date(p.updatedAt) < deadStockDate).map(p => ({
            name: p.name,
            updatedAt: p.updatedAt,
            daysInactive: Math.floor((now - new Date(p.updatedAt)) / (1000 * 60 * 60 * 24)),
            totalValue: (p.cp || 0) * (p.quantity || 0)
        }));

        const topProfitEarners = products.map(p => {
            const cp = p.cp || 0;
            const sp = p.price || 0;
            const profit = sp - cp;
            const margin = sp > 0 ? (profit / sp) * 100 : 0;
            return { name: p.name, cp, sp, profit, margin };
        }).sort((a, b) => b.profit - a.profit).slice(0, 5);

        return {
            totalItems: products.length,
            totalStockValue,
            lowStockCount,
            outOfStockCount,
            expiringSoonCount,
            expiredCount,
            totalUdhaarPending,
            totalUsers,
            topProducts,
            totalRevenue: 0, // Placeholder until Order module is ready
            totalSold: 0,    // Placeholder until Order module is ready
            refreshAt: new Date().toISOString(),
            expiringSoonList: expiringSoonProducts
                .map(p => ({
                    name: p.name,
                    batchNumber: p.batchNumber || '-',
                    exp: p.exp,
                    daysLeft: Math.ceil((new Date(p.exp) - now) / (1000 * 60 * 60 * 24))
                }))
                .sort((a, b) => a.daysLeft - b.daysLeft)
                .slice(0, 10),
            lowStockList,
            deadStockList,
            topProfitEarners,
            bestSellers: topProducts // Reusing topProducts as bestSellers temporarily
        };
    }
}

export default new StatsService();
