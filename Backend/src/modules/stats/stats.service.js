import { User } from "../user/user.model.js";
import { Product } from "../product/product.model.js";
import { Udhaar } from "../udhaar/udhaar.model.js";
import { Inventory } from "../product/inventory.model.js";
import { SmartExpiry } from "../product/smartExpiry.model.js";
import { Store } from "../store/store.model.js";
import { withStore } from "../../utils/storeHelper.js";

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
        const filter = withStore({}, { storeId });
        const now = new Date();
        now.setHours(0,0,0,0);

        const store = await Store.findById(storeId);
        const lowThreshold = store?.lowStockThreshold || 10;

        // 1. Inventory & Products
        // We need both to get names and images, but quantity from inventory
        const inventory = await Inventory.find(filter).populate("productId");
        const products = await Product.find(filter);
        
        const totalStockValue = inventory.reduce((acc, item) => acc + ((item.cp || 0) * (item.quantity || 0)), 0);
        const lowStockCount = inventory.filter(item => item.quantity > 0 && item.quantity <= (item.reorderPoint || lowThreshold)).length;
        const outOfStockCount = inventory.filter(item => item.quantity === 0).length;

        // 2. Smart Expiry Stats (from SmartExpiry collection)
        const expiringSoonCount = await SmartExpiry.countDocuments({ ...filter, status: 'expiring' });
        const expiredCount = await SmartExpiry.countDocuments({ ...filter, status: 'expired' });
        const expiringSoonList = await SmartExpiry.find({ ...filter, status: 'expiring' })
            .populate("productId", "name brand image")
            .limit(6)
            .sort({ expiryDate: 1 });

        // 3. Udhaar Stats
        const udhaarRecords = await Udhaar.find(filter);
        const totalUdhaarPending = udhaarRecords.reduce((acc, u) => acc + (u.balance || 0), 0);

        // 4. User (Staff) Stats
        const totalUsers = await User.countDocuments({ ...filter, role: 'staff' });

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
            refreshAt: new Date().toISOString(),
            expiringSoonList: expiringSoonList.map(item => ({
                name: item.productId?.name,
                exp: item.expiryDate.toISOString().split('T')[0],
                daysLeft: Math.ceil((item.expiryDate - now) / (1000 * 60 * 60 * 24))
            })),
            outOfStockList,
            bestSellers: topProducts // Placeholder for real sales data later
        };
    }
}

export default new StatsService();
