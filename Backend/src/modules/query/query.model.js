import mongoose, { Schema } from "mongoose";

const replySchema = new Schema({
    author: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const querySchema = new Schema(
    {
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Store',
            required: true,
            index: true
        },
        staffName: { type: String, required: true },
        role: { type: String, required: true },
        subject: { type: String, required: true },
        description: { type: String, required: true },
        status: { type: String, enum: ['open', 'closed'], default: 'open' },
        replies: [replySchema],
        images: [{ name: String, data: String }],
        closedBy: { type: String }
    },
    {
        timestamps: true
    }
);

querySchema.index({ storeId: 1, status: 1 });

export const Query = mongoose.model("Query", querySchema);
