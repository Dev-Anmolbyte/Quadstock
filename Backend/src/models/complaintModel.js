import mongoose from "mongoose";

const replySchema = new mongoose.Schema({
    author: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const complaintSchema = new mongoose.Schema({
    ownerId: { type: String, required: true },
    staffName: { type: String, required: true },
    role: { type: String, required: true },
    type: { type: String, enum: ['complaint', 'query'], default: 'complaint' },
    subject: { type: String, required: true },
    description: { type: String, required: true },
    status: { type: String, enum: ['pending', 'in-progress', 'resolved', 'closed', 'open'], default: 'open' },
    replies: [replySchema],
    images: [{ name: String, data: String }], // Store small preview data or URLs
    closedBy: { type: String }
}, { timestamps: true });

const Complaint = mongoose.models.Complaint || mongoose.model("Complaint", complaintSchema);

export { Complaint };
