import mongoose, { Schema } from "mongoose";

const replySchema = new Schema({
    author: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const complaintSchema = new Schema(
    {
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
            index: true
        },
        staffName: { type: String, required: true },
        role: { type: String, required: true },
        type: { type: String, enum: ['complaint', 'query'], default: 'complaint' },
        subject: { type: String, required: true },
        description: { type: String, required: true },
        status: { type: String, enum: ['pending', 'in-progress', 'resolved', 'closed', 'open'], default: 'open' },
        replies: [replySchema],
        images: [{ name: String, data: String }], // Store small preview data or URLs
        closedBy: { type: String }
    },
    {
        timestamps: true
    }
);

complaintSchema.index({ storeId: 1, type: 1, status: 1 });

export const Complaint = mongoose.model("Complaint", complaintSchema);
