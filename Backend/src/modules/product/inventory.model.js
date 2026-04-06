import mongoose, { Schema } from "mongoose";

const inventorySchema = new Schema(
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
        batchNumber: { type: String, trim: true },
        quantity: { type: Number, default: 0, min: 0 },
        unit: { type: String, default: 'pcs' },
        
        // Dates
        mfd: { type: String },
        exp: { type: String },
        
        // Pricing for this batch
        pp: { type: Number, default: 0, min: 0 }, // Purchase Price
        cp: { type: Number, default: 0, min: 0 }, // MRP
        price: { type: Number, default: 0, min: 0 }, // Selling Price
        
        reorderPoint: { type: Number, default: 10, min: 0 }
    },
    {
        timestamps: true
    }
);

// Compound index for unique batch per product per store
inventorySchema.index({ storeId: 1, productId: 1, batchNumber: 1 }, { unique: true });

export const Inventory = mongoose.model("Inventory", inventorySchema);
