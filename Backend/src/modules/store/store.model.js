import mongoose, { Schema } from "mongoose";

const storeSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        storeUniqueId: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            immutable: true
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        address: { type: String, trim: true },
        phoneNumber: { type: String, trim: true },
        gstNumber: { type: String, trim: true, uppercase: true },
        logoUrl: { type: String, trim: true },
        storeTerms: { type: String, trim: true, default: "Thank you for shopping with us!" },
        upiId: { type: String, trim: true },
        email: { type: String, trim: true },
        staticQrUrl: { type: String, trim: true },
        highStockThreshold: { type: Number, default: 100 },
        healthyExpiryThreshold: { type: Number, default: 30 },
        expiryWarningThreshold: { type: Number, default: 14 },
        expiryCriticalThreshold: { type: Number, default: 7 },
        lowStockThreshold: { type: Number, default: 10 },
        defaultTax: { type: Number, default: 18 },
        // Region & Notifications
        language: { type: String, default: "en" },
        dateFormat: { type: String, default: "dd-mm-yyyy" },
        timeFormat: { type: String, default: "12" },
        notifLowStock: { type: Boolean, default: true },
        notifUdhaarOverdue: { type: Boolean, default: true },
        notifPaymentReminders: { type: Boolean, default: false },
        
        // Subscription Management
        subscriptionPlan: {
            type: String,
            enum: ["free", "pro", "enterprise"],
            default: "free"
        },
        subscriptionStatus: {
            type: String,
            enum: ["active", "inactive", "expired"],
            default: "active" // Default for free plan
        },
        subscriptionExpiry: {
            type: Date,
            default: () => new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000) // Virtually infinite for free plan
        },
        subscriptionCycle: { type: String, enum: ["none", "monthly", "quarter", "half", "yearly"], default: "none" },
        subscriptionAmount: { type: Number, default: 0 },
        razorpayOrderId: { type: String },
        razorpayPaymentId: { type: String },
    },

    {
        timestamps: true
    }
);

export const Store = mongoose.model("Store", storeSchema);
