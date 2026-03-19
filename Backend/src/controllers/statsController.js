import { User } from "../models/userModel.js";
import { Product } from "../models/productModel.js";
import { Udhaar } from "../models/udhaarModel.js";

const getPublicStats = async (req, res) => {
    try {
        const totalStores = await User.countDocuments({ role: 'owner' });
        const totalProducts = await Product.countDocuments();
        const totalTransactions = await Udhaar.countDocuments();
        const timeSavedPercent = 45; 

        return res.status(200).json({
            success: true,
            data: {
                totalStores: totalStores || 0,
                totalProducts: totalProducts || 0,
                totalTransactions: totalTransactions || 0,
                timeSavedPercent: timeSavedPercent
            }
        });

    } catch (error) {
        console.error("Public Stats Error:", error);
        return res.status(500).json({ success: false, message: error.message });
    }
};

const getOwnerStats = async (req, res) => {
    try {
        const { ownerId } = req.query;
        if (!ownerId) return res.status(400).json({ success: false, message: "ownerId is required" });

        // 1. Inventory Stats
        const products = await Product.find({ ownerId });
        
        // Use CP (Cost Price) for total stock value calculation
        const totalStockValue = products.reduce((acc, p) => acc + ((p.cp || 0) * (p.quantity || 0)), 0);
        
        // Low Stock Count (Below or equal to reorderPoint)
        const lowStockCount = products.filter(p => p.quantity > 0 && p.quantity <= (p.reorderPoint || 10)).length;
        
        // Out of Stock (Exactly 0)
        const outOfStockCount = products.filter(p => p.quantity === 0).length;

        // 2. Expiry Stats (Within 30 days)
        const now = new Date();
        const thirtyDaysLater = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        
        const expiringSoonCount = products.filter(p => {
            if (!p.exp) return false;
            const expDate = new Date(p.exp);
            return expDate > now && expDate <= thirtyDaysLater;
        }).length;

        // 3. Udhaar Stats
        const udhaarRecords = await Udhaar.find({ ownerId });
        const totalUdhaarPending = udhaarRecords.reduce((acc, u) => acc + (u.balance || 0), 0);

        res.status(200).json({
            success: true,
            data: {
                totalItems: products.length,
                totalStockValue,
                lowStockCount,
                outOfStockCount,
                expiringSoonCount,
                totalUdhaarPending,
                refreshAt: new Date().toISOString()
            }
        });

    } catch (error) {
        console.error("Owner Stats Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

export { getPublicStats, getOwnerStats };
