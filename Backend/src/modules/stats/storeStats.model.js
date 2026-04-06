import mongoose, { Schema } from "mongoose";

const storeStatsSchema = new Schema(
    {
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
            index: true
        },
        month: { 
            type: Number, 
            required: true, 
            min: 1, 
            max: 12 
        },
        year: { 
            type: Number, 
            required: true 
        },
        totalRevenue: { 
            type: Number, 
            default: 0 
        },
        totalRecovered: { 
            type: Number, 
            default: 0 
        },
        totalUdhaarIssued: { 
            type: Number, 
            default: 0 
        },
        lastUpdatedValue: { 
            type: Date, 
            default: Date.now 
        }
    },
    {
        timestamps: true
    }
);

// Compound index to ensure uniqueness per shop per month
storeStatsSchema.index({ storeId: 1, month: 1, year: 1 }, { unique: true });

export const StoreStats = mongoose.model("StoreStats", storeStatsSchema);
