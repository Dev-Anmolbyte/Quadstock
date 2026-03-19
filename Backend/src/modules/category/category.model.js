import mongoose, { Schema } from "mongoose";

const categorySchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        storeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Store",
            required: true
        }
    },
    {
        timestamps: true
    }
);

export const Category = mongoose.model("Category", categorySchema);
