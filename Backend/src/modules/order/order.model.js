import mongoose, { Schema } from "mongoose";

const orderSchema = new Schema(
    {
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
            index: true
        },
        employeeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Employee'
        },
        items: [
            {
                productId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Product',
                    required: true
                },
                productType: { type: String, enum: ['packed', 'loose'], required: true },
                quantity: { type: Number, required: true },
                price: { type: Number, required: true },
                total: { type: Number, required: true },
                unit: { type: String }
            }
        ],
        totalAmount: { type: Number, required: true },
        paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'credit'], default: 'cash' },
        status: { type: String, enum: ['completed', 'cancelled', 'refunded'], default: 'completed' }
    },
    {
        timestamps: true
    }
);

export const Order = mongoose.model("Order", orderSchema);
