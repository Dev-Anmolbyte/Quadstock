import { Store } from "./store.model.js";
import { Product } from "../product/product.model.js";
import { Inventory } from "../product/inventory.model.js";
import { SmartExpiry } from "../product/smartExpiry.model.js";
import { Udhaar } from "../udhaar/udhaar.model.js";
import { Employee } from "../employee/employee.model.js";
import { Category } from "../category/category.model.js";
import { Complaint } from "../complaint/complaint.model.js";
import { Query } from "../query/query.model.js";
import { Order } from "../order/order.model.js";
import { StoreStats } from "../stats/storeStats.model.js";
import { User } from "../user/user.model.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";

const getStoreDetails = asyncHandler(async (req, res) => {
    const store = await Store.findById(req.user.storeId);
    if (!store) throw new ApiError(404, "Store not found");

    const [productCount, employeeCount] = await Promise.all([
        Product.countDocuments({ storeId: req.user.storeId }),
        Employee.countDocuments({ storeId: req.user.storeId })
    ]);

    return res.status(200).json({
        success: true,
        data: {
            ...store.toObject(),
            productCount,
            employeeCount
        }
    });
});

const updateStore = asyncHandler(async (req, res) => {
    const store = await Store.findOneAndUpdate(
        { _id: req.user.storeId, ownerId: req.user._id }, // Only owner can update
        req.body,
        { returnDocument: 'after' }
    );
    if (!store) throw new ApiError(404, "Store not found or unauthorized");

    return res.status(200).json({
        success: true,
        data: store,
        message: "Store details updated successfully"
    });
});

const resetStoreData = asyncHandler(async (req, res) => {
    const { storeId, _id: userId } = req.user;

    // PERFORM TOTAL SYSTEM WIPE FOR THIS STORE
    // 1. Transactional & Business Data
    await Promise.all([
        Product.deleteMany({ storeId }),
        Inventory.deleteMany({ storeId }),
        SmartExpiry.deleteMany({ storeId }),
        Udhaar.deleteMany({ storeId }),
        Employee.deleteMany({ storeId }),
        Category.deleteMany({ storeId }),
        Complaint.deleteMany({ storeId }),
        Query.deleteMany({ storeId }),
        Order.deleteMany({ storeId }),
        StoreStats.deleteMany({ storeId })
    ]);

    // 2. The Store itself
    await Store.findByIdAndDelete(storeId);

    // 3. The Owner account
    await User.findByIdAndDelete(userId);

    return res.status(200).json({
        success: true,
        message: "Your entire store and account footprint has been permanently deleted from QuadStock."
    });
});

const exportStoreData = asyncHandler(async (req, res) => {
    const { storeId } = req.user;

    // Fetch all store-related data in parallel
    const [
        store,
        products,
        inventory,
        expiry,
        udhaar,
        employees,
        categories,
        complaints,
        queries,
        orders,
        stats
    ] = await Promise.all([
        Store.findById(storeId),
        Product.find({ storeId }),
        Inventory.find({ storeId }),
        SmartExpiry.find({ storeId }),
        Udhaar.find({ storeId }),
        Employee.find({ storeId }).select("-password -refreshToken"),
        Category.find({ storeId }),
        Complaint.find({ storeId }),
        Query.find({ storeId }),
        Order.find({ storeId }),
        StoreStats.find({ storeId })
    ]);

    const backupData = {
        exportDate: new Date().toISOString(),
        store: store || {},
        inventory: {
            products: products || [],
            batches: inventory || [],
            expiryRecords: expiry || [],
            categories: categories || []
        },
        transactions: {
            orders: orders || [],
            udhaar: udhaar || [],
            stats: stats || []
        },
        staff: employees || [],
        support: {
            complaints: complaints || [],
            queries: queries || []
        }
    };

    return res.status(200).json({
        success: true,
        data: backupData,
        message: "Full store backup generated successfully"
    });
});

const getNotificationSummary = asyncHandler(async (req, res) => {
    const { storeId } = req.user;

    const store = await Store.findById(storeId);
    if (!store) throw new ApiError(404, "Store not found");

    const now = new Date();
    const [openQueries, openComplaints] = await Promise.all([
        Query.countDocuments({ storeId, status: "open" }),
        Complaint.countDocuments({ storeId, status: "open" })
    ]);

    let lowStock = 0;
    if (store.notifLowStock) {
        const threshold = store.lowStockThreshold || 10;
        lowStock = await Inventory.countDocuments({
            storeId,
            quantity: { $gt: 0, $lte: threshold }
        });
    }

    let udhaarOverdue = 0;
    if (store.notifUdhaarOverdue) {
        udhaarOverdue = await Udhaar.countDocuments({
            storeId,
            balance: { $gt: 0 },
            $or: [
                { status: 'overdue' },
                { dueDate: { $lt: now.toISOString().split('T')[0] } }
            ]
        });
    }

    let expiries = 0;
    // Expiry notifications are always useful, but we can check a generic pro setting if desired
    // For now, let's include it.
    const expiryThreshold = store.healthyExpiryThreshold || 30;
    const expiryDateLimit = new Date();
    expiryDateLimit.setDate(expiryDateLimit.getDate() + expiryThreshold);

    expiries = await SmartExpiry.countDocuments({
        storeId,
        expiryDate: { $lte: expiryDateLimit },
        quantity: { $gt: 0 }
    });

    return res.status(200).json({
        success: true,
        data: {
            queries: openQueries,
            complaints: openComplaints,
            lowStock,
            udhaarOverdue,
            expiries
        }
    });
});

export { getStoreDetails, updateStore, resetStoreData, exportStoreData, getNotificationSummary };
