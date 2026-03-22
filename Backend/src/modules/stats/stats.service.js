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
        
        const expiringSoonCount = products.filter(p => {
            if (!p.exp) return false;
            const expDate = new Date(p.exp);
            return expDate > now && expDate <= thirtyDaysLater;
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

        return {
            totalItems: products.length,
            totalStockValue,
            lowStockCount,
            outOfStockCount,
            expiringSoonCount,
            totalUdhaarPending,
            totalUsers,
            topProducts,
            totalRevenue: 0, // Placeholder until Order module is ready
            totalSold: 0,    // Placeholder until Order module is ready
            refreshAt: new Date().toISOString(),
            expiringSoonList: expiringSoonProducts
                .map(p => ({
                    name: p.name,
                    exp: p.exp,
                    daysLeft: Math.ceil((new Date(p.exp) - new Date()) / (1000 * 60 * 60 * 24))
                }))
                .sort((a, b) => a.daysLeft - b.daysLeft)
                .slice(0, 5)
        };
    }
}

export default new StatsService();
