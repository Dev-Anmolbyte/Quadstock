import mongoose, { Schema } from "mongoose";

const productSchema = new Schema(
    {
        name: { type: String, required: true, trim: true },
        brand: { type: String, trim: true },
        type: { type: String, enum: ['Kirana', 'Clothes'], default: 'Kirana' },
        categoryId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true
        },
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
            index: true
        },
        description: { type: String, trim: true },
        image: { type: String }, // Cloudinary URL
        barcode: { type: String, trim: true },
        batchNumber: { type: String, trim: true },
        quantity: { type: Number, default: 0 },
        unit: { type: String, default: 'pcs' },

        // Grocery specific
        mfd: { type: String },
        exp: { type: String },
        weight: { type: String },

        // Clothes specific
        size: { type: String },
        color: { type: String },

        reorderPoint: { type: Number, default: 10 },

        // Pricing
        pp: { type: Number, default: 0 }, // Purchase Price
        cp: { type: Number, default: 0 }, // Cost Price / MRP
        price: { type: Number, default: 0 }, // Selling Price

        // Discounts
        discount: { type: Number, default: 0 }, // Current active discount amount or percentage
        discountType: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
        discountHistory: [{
            amount: { type: Number, required: true },
            type: { type: String, enum: ['percentage', 'fixed'], required: true },
            reason: { type: String, trim: true },
            appliedBy: { type: String }, // Store the name or ID of the user who applied it
            date: { type: Date, default: Date.now }
        }]
    },
    {
        timestamps: true
    }
);

productSchema.index({ storeId: 1, name: 1 }); // Compound index for search optimization

export const Product = mongoose.model("Product", productSchema);
