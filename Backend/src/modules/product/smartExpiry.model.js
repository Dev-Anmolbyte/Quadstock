import mongoose, { Schema } from "mongoose";

const smartExpirySchema = new Schema(
    {
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
            index: true
        },
        expiryDate: {
            type: Date,
            required: true,
            index: true
        },
        quantity: {
            type: Number,
            required: true,
            default: 0
        },
        status: {
            type: String,
            enum: ['safe', 'expiring', 'expired'],
            default: 'safe'
        }
    },
    {
        timestamps: true
    }
);

// Virtual for dynamic status (calculated on query if needed, but the user wants it stored)
// We will update status on each fetch or via script.
// The user asked for it to be integrated with store filtering.

export const SmartExpiry = mongoose.model("SmartExpiry", smartExpirySchema);
