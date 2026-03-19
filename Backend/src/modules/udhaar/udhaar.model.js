import mongoose, { Schema } from "mongoose";

const transactionSchema = new Schema({
    date: { type: String, required: true },
    type: { type: String, enum: ['taken', 'payment'], required: true },
    amount: { type: Number, required: true },
    mode: { type: String }, // Cash, UPI, Card, etc.
    description: { type: String }
});

const udhaarSchema = new Schema(
    {
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
            index: true
        },
        name: { type: String, required: true, trim: true },
        contact: { type: String, trim: true },
        date: { type: String, required: true },
        dueDate: { type: String },
        totalAmount: { type: Number, required: true },
        balance: { type: Number, required: true },
        status: { type: String, enum: ['pending', 'paid', 'overdue'], default: 'pending' },
        transactions: [transactionSchema]
    },
    {
        timestamps: true
    }
);

udhaarSchema.index({ storeId: 1, name: 1 });

export const Udhaar = mongoose.model("Udhaar", udhaarSchema);
