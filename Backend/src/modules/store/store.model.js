import mongoose, { Schema } from "mongoose";

const storeSchema = new Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            unique: true
        },
        storeUniqueId: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true,
            immutable: true
        },
        ownerId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        address: { type: String, trim: true },
        phoneNumber: { type: String, trim: true },
    },
    {
        timestamps: true
    }
);

export const Store = mongoose.model("Store", storeSchema);
