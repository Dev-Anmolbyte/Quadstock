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
    },
    {
        timestamps: true
    }
);

export const Store = mongoose.model("Store", storeSchema);
