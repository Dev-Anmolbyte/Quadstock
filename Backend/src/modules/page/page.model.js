import mongoose, { Schema } from "mongoose";

const sectionSchema = new Schema({
    title: { type: String, required: true },
    content: { type: String, required: true }, // Can be HTML or JSON
    icon: { type: String } // FontAwesome icon name
});

const pageSchema = new Schema(
    {
        slug: {
            type: String,
            required: true,
            unique: true,
            index: true,
            lowercase: true,
            trim: true
        },
        title: { type: String, required: true },
        description: { type: String },
        sections: [sectionSchema],
        metadata: {
            type: Map,
            of: String
        }
    },
    {
        timestamps: true
    }
);

export const Page = mongoose.model("Page", pageSchema);
