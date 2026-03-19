import mongoose, { Schema } from "mongoose";

const productSchema = new Schema(
    {
        ownerId: { type: String, required: true }, // Links to the Shop Owner
        name: { type: String, required: true, trim: true },
        brand: { type: String, trim: true },
        type: { type: String, enum: ['Kirana', 'Clothes'], default: 'Kirana' },
        category: { type: String, trim: true },
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
    },
    {
        timestamps: true
    }
);

export const Product = mongoose.model("Product", productSchema);
