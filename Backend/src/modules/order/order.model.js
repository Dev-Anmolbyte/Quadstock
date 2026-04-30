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
        discountType: { type: String, enum: ['flat', 'percentage', 'none'], default: 'none' },
        discountValue: { type: Number, default: 0 },
        paymentMethod: { type: String, enum: ['cash', 'card', 'upi', 'credit', 'udhaar'], default: 'cash' },
        customerName: { type: String, trim: true },
        customerPhone: { type: String, trim: true },
        dueDate: { type: String },
        status: { type: String, enum: ['completed', 'cancelled', 'refunded'], default: 'completed' }
    },
    {
        timestamps: true
    }
);

export const Order = mongoose.model("Order", orderSchema);
